"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchProvider = void 0;
const vscode = __importStar(require("vscode"));
const searchTypes_1 = require("./searchTypes");
const textAnalyzer_1 = require("./textAnalyzer");
class SearchProvider {
    textAnalyzer;
    constructor() {
        this.textAnalyzer = new textAnalyzer_1.TextAnalyzer();
    }
    /**
     * Search for a term across the entire workspace
     */
    async searchInWorkspace(searchTerm, config, progressCallback, cancellationToken) {
        const startTime = Date.now();
        const results = {
            searchTerm,
            totalMatches: 0,
            categories: new Map(),
            searchedFiles: 0,
            searchTime: 0
        };
        // Initialize all categories
        Object.values(searchTypes_1.UsageCategory).forEach(category => {
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
                }
                catch (error) {
                    console.warn(`Failed to search file ${file.fsPath}:`, error);
                    filesSearched++;
                    results.searchedFiles = filesSearched;
                    progressCallback?.(filesSearched, files.length);
                }
            }
        }
        catch (error) {
            console.error('Workspace search error:', error);
            throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        results.searchTime = Date.now() - startTime;
        return results;
    }
    /**
     * Search for a term in a single file
     */
    async searchInFile(document, searchTerm, config) {
        const startTime = Date.now();
        const results = await this.searchInDocument(document, searchTerm, config);
        results.searchedFiles = 1;
        results.searchTime = Date.now() - startTime;
        return results;
    }
    /**
     * Search in a single document
     */
    async searchInDocument(document, searchTerm, config) {
        const results = {
            searchTerm,
            totalMatches: 0,
            categories: new Map(),
            searchedFiles: 0,
            searchTime: 0
        };
        // Initialize all categories
        Object.values(searchTypes_1.UsageCategory).forEach(category => {
            results.categories.set(category, []);
        });
        const text = document.getText();
        const lines = text.split('\n');
        // Create search pattern
        const searchPattern = this.createSearchPattern(searchTerm, config);
        // Search each line
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber];
            const matches = this.findMatches(line, searchPattern, config);
            for (const match of matches) {
                // Analyze the context of this match
                const searchMatch = await this.analyzeMatch(document, lineNumber, match.index, searchTerm, line, lines, config);
                if (searchMatch) {
                    const categoryMatches = results.categories.get(searchMatch.category) || [];
                    categoryMatches.push(searchMatch);
                    results.categories.set(searchMatch.category, categoryMatches);
                    results.totalMatches++;
                }
            }
        }
        return results;
    }
    /**
     * Find files to search based on configuration
     */
    async findFilesToSearch(config) {
        const includePattern = `{${config.includePatterns.join(',')}}`;
        const excludePattern = `{${config.excludePatterns.join(',')}}`;
        try {
            const files = await vscode.workspace.findFiles(includePattern, excludePattern);
            return files.filter(file => {
                // Additional filtering if needed
                const fileName = file.fsPath.toLowerCase();
                // Skip binary files
                const binaryExtensions = ['.exe', '.dll', '.so', '.dylib', '.bin', '.jpg', '.jpeg', '.png', '.gif', '.pdf'];
                if (binaryExtensions.some(ext => fileName.endsWith(ext))) {
                    return false;
                }
                return true;
            });
        }
        catch (error) {
            console.error('Error finding files:', error);
            return [];
        }
    }
    /**
     * Create search pattern based on configuration
     */
    createSearchPattern(searchTerm, config) {
        let pattern = searchTerm;
        if (!config.useRegex) {
            // Escape special regex characters
            pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        const flags = config.caseSensitive ? 'g' : 'gi';
        try {
            return new RegExp(pattern, flags);
        }
        catch (error) {
            // If regex is invalid, fall back to literal search
            const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return new RegExp(escapedTerm, flags);
        }
    }
    /**
     * Find all matches in a line
     */
    findMatches(line, pattern, config) {
        const matches = [];
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
    async analyzeMatch(document, lineNumber, columnIndex, searchTerm, lineText, allLines, config) {
        // Check if we should include this match based on configuration
        const context = this.textAnalyzer.getMatchContext(lineText, columnIndex, allLines, lineNumber);
        if (!config.includeComments && context.isInComment) {
            return null;
        }
        if (!config.includeStringLiterals && context.isInString) {
            return null;
        }
        // Categorize the match
        const category = this.textAnalyzer.categorizeMatch(lineText, columnIndex, searchTerm, context, allLines, lineNumber, document.languageId);
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
    getSearchStats(results) {
        const stats = {};
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
    filterResultsByCategory(results, categories) {
        const filteredResults = {
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
    sortResults(results, sortBy = 'file') {
        const sortedResults = {
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
exports.SearchProvider = SearchProvider;
//# sourceMappingURL=searchProvider.js.map