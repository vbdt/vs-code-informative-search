import * as vscode from 'vscode';
import { SearchConfiguration, CategorizedResults, SearchMatch, UsageCategory } from './searchTypes';
import { TextAnalyzer } from './textAnalyzer';

export class SearchProvider {
    private textAnalyzer: TextAnalyzer;

    constructor() {
        this.textAnalyzer = new TextAnalyzer();
    }

    /**
     * Search for a term across the entire workspace
     */
    async searchInWorkspace(
        searchTerm: string,
        config: SearchConfiguration,
        progressCallback?: (filesSearched: number, totalFiles: number) => void,
        cancellationToken?: vscode.CancellationToken
    ): Promise<CategorizedResults> {
        const startTime = Date.now();
        const results: CategorizedResults = {
            searchTerm,
            totalMatches: 0,
            categories: new Map(),
            searchedFiles: 0,
            searchTime: 0
        };

        // Initialize all categories
        Object.values(UsageCategory).forEach(category => {
            results.categories.set(category, []);
        });

        try {
            // Find files to search
            const files = await this.findFilesToSearch(config);
            
            if (files.length === 0) {
                results.searchTime = Date.now() - startTime;
                return results;
            }

            let filesSearched = 0;
            
            // Search each file
            for (const file of files) {
                if (cancellationToken?.isCancellationRequested) {
                    break;
                }

                try {
                    const document = await vscode.workspace.openTextDocument(file);
                    const fileResults = await this.searchInDocument(document, searchTerm, config);
                    
                    // Merge results
                    for (const [category, matches] of fileResults.categories) {
                        const existingMatches = results.categories.get(category) || [];
                        
                        // Apply max results per category limit
                        const availableSlots = config.maxResultsPerCategory - existingMatches.length;
                        if (availableSlots > 0) {
                            const matchesToAdd = matches.slice(0, availableSlots);
                            results.categories.set(category, [...existingMatches, ...matchesToAdd]);
                            results.totalMatches += matchesToAdd.length;
                        }
                    }
                    
                    filesSearched++;
                    results.searchedFiles = filesSearched;
                    
                    // Report progress
                    progressCallback?.(filesSearched, files.length);
                    
                } catch (error) {
                    console.warn(`Failed to search file ${file.fsPath}:`, error);
                    filesSearched++;
                    results.searchedFiles = filesSearched;
                    progressCallback?.(filesSearched, files.length);
                }
            }

        } catch (error) {
            console.error('Workspace search error:', error);
            throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        results.searchTime = Date.now() - startTime;
        return results;
    }

    /**
     * Search for a term in a single file
     */
    async searchInFile(
        document: vscode.TextDocument,
        searchTerm: string,
        config: SearchConfiguration
    ): Promise<CategorizedResults> {
        const startTime = Date.now();
        
        const results = await this.searchInDocument(document, searchTerm, config);
        results.searchedFiles = 1;
        results.searchTime = Date.now() - startTime;
        
        return results;
    }

    /**
     * Search in a single document
     */
    private async searchInDocument(
      document: vscode.TextDocument,
      searchTerm: string,
      config: SearchConfiguration
    ): Promise<CategorizedResults> {
        const results: CategorizedResults = {
            searchTerm,
            totalMatches: 0,
            categories: new Map(),
            searchedFiles: 0,
            searchTime: 0
        };

        // Initialize all categories
        Object.values(UsageCategory).forEach(category => {
            results.categories.set(category, []);
        });

        const text = document.getText();
        const lines = text.split('\n');
        
        console.log(`🔍 Searching in file: ${document.fileName}`);
        console.log(`🔍 File has ${lines.length} lines`);
        
        // Create search pattern
        const searchPattern = this.createSearchPattern(searchTerm, config);
        
        let totalMatchesInFile = 0;
        
        // Search each line
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber];
            const matches = this.findMatches(line, searchPattern, config);
            
            if (matches.length > 0) {
                console.log(`🔍 Line ${lineNumber + 1}: Found ${matches.length} matches - "${line.trim()}"`);
            }
            
            for (const match of matches) {
                // Analyze the context of this match
                const searchMatch = await this.analyzeMatch(
                    document,
                    lineNumber,
                    match.index,
                    searchTerm,
                    line,
                    lines,
                    config
                );

                if (searchMatch) {
                    console.log(`🔍 Match categorized as: ${searchMatch.category}`);
                    const categoryMatches = results.categories.get(searchMatch.category) || [];
                    categoryMatches.push(searchMatch);
                    results.categories.set(searchMatch.category, categoryMatches);
                    results.totalMatches++;
                    totalMatchesInFile++;
                } else {
                    console.log(`🔍 Match was filtered out (null result)`);
                }
            }
        }
        
        console.log(`🔍 File ${document.fileName}: ${totalMatchesInFile} matches found`);
        return results;
    }

    /**
     * Find files to search based on configuration
     */
    private async findFilesToSearch(config: SearchConfiguration): Promise<vscode.Uri[]> {
    // Don't wrap in extra braces if we already have complex patterns
      const includePattern = config.includePatterns.length === 1 
          ? config.includePatterns[0] 
          : `{${config.includePatterns.join(',')}}`;
      
      const excludePattern = config.excludePatterns.length === 1
          ? config.excludePatterns[0]
          : `{${config.excludePatterns.join(',')}}`;
      
      console.log('🔍 Looking for files with pattern:', includePattern);
      console.log('🔍 Excluding pattern:', excludePattern);
      
      try {
          const files = await vscode.workspace.findFiles(includePattern, excludePattern);
          console.log('🔍 Found files:', files.length);
          console.log('🔍 First few files:', files.slice(0, 5).map(f => f.fsPath));
          
          return files.filter(file => {
              const fileName = file.fsPath.toLowerCase();
              
              // Skip binary files
              const binaryExtensions = ['.exe', '.dll', '.so', '.dylib', '.bin', '.jpg', '.jpeg', '.png', '.gif', '.pdf'];
              if (binaryExtensions.some(ext => fileName.endsWith(ext))) {
                  return false;
              }
              
              return true;
          });
      } catch (error) {
          console.error('🔍 Error finding files:', error);
          return [];
      }
    }

    /**
     * Create search pattern based on configuration
     */
    private createSearchPattern(searchTerm: string, config: SearchConfiguration): RegExp {
        let pattern = searchTerm;
        
        if (!config.useRegex) {
            // Escape special regex characters
            pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        
        const flags = config.caseSensitive ? 'g' : 'gi';
        
        try {
            return new RegExp(pattern, flags);
        } catch (error) {
            // If regex is invalid, fall back to literal search
            const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return new RegExp(escapedTerm, flags);
        }
    }

    /**
     * Find all matches in a line
     */
    private findMatches(line: string, pattern: RegExp, config: SearchConfiguration): Array<{ index: number; match: string }> {
        const matches: Array<{ index: number; match: string }> = [];
        let match;
        
        // Reset regex state
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(line)) !== null) {
            matches.push({
                index: match.index,
                match: match[0]
            });
            
            // Prevent infinite loop for zero-width matches
            if (match.index === pattern.lastIndex) {
                pattern.lastIndex++;
            }
        }
        
        return matches;
    }

    /**
     * Analyze a match to determine its category and context
     */
    private async analyzeMatch(
        document: vscode.TextDocument,
        lineNumber: number,
        columnIndex: number,
        searchTerm: string,
        lineText: string,
        allLines: string[],
        config: SearchConfiguration
    ): Promise<SearchMatch | null> {
        // Check if we should include this match based on configuration
        const context = this.textAnalyzer.getMatchContext(lineText, columnIndex, allLines, lineNumber);
        
        if (!config.includeComments && context.isInComment) {
            return null;
        }
        
        if (!config.includeStringLiterals && context.isInString) {
            return null;
        }

        // Categorize the match
        const category = this.textAnalyzer.categorizeMatch(
            lineText,
            columnIndex,
            searchTerm,
            context,
            allLines,
            lineNumber,
            document.languageId
        );

        // Create the search match
        const startPosition = new vscode.Position(lineNumber, columnIndex);
        const endPosition = new vscode.Position(lineNumber, columnIndex + searchTerm.length);
        const range = new vscode.Range(startPosition, endPosition);

        return {
            searchTerm,
            file: document.uri,
            line: lineNumber,
            column: columnIndex,
            lineText: lineText,
            category,
            context,
            range
        };
    }

    /**
     * Get search statistics
     */
    getSearchStats(results: CategorizedResults): { [category: string]: number } {
        const stats: { [category: string]: number } = {};
        
        for (const [category, matches] of results.categories) {
            if (matches.length > 0) {
                stats[category] = matches.length;
            }
        }
        
        return stats;
    }

    /**
     * Filter results by category
     */
    filterResultsByCategory(results: CategorizedResults, categories: UsageCategory[]): CategorizedResults {
        const filteredResults: CategorizedResults = {
            ...results,
            categories: new Map(),
            totalMatches: 0
        };

        for (const category of categories) {
            const matches = results.categories.get(category) || [];
            if (matches.length > 0) {
                filteredResults.categories.set(category, matches);
                filteredResults.totalMatches += matches.length;
            }
        }

        return filteredResults;
    }

    /**
     * Sort results within categories
     */
    sortResults(results: CategorizedResults, sortBy: 'file' | 'line' | 'relevance' = 'file'): CategorizedResults {
        const sortedResults: CategorizedResults = {
            ...results,
            categories: new Map()
        };

        for (const [category, matches] of results.categories) {
            const sortedMatches = [...matches];
            
            switch (sortBy) {
                case 'file':
                    sortedMatches.sort((a, b) => {
                        const fileCompare = a.file.fsPath.localeCompare(b.file.fsPath);
                        return fileCompare !== 0 ? fileCompare : a.line - b.line;
                    });
                    break;
                case 'line':
                    sortedMatches.sort((a, b) => a.line - b.line);
                    break;
                case 'relevance':
                    // Sort by category priority, then by file
                    sortedMatches.sort((a, b) => {
                        const fileCompare = a.file.fsPath.localeCompare(b.file.fsPath);
                        return fileCompare !== 0 ? fileCompare : a.line - b.line;
                    });
                    break;
            }
            
            sortedResults.categories.set(category, sortedMatches);
        }

        return sortedResults;
    }
}