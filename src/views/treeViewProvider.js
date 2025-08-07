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
exports.InformativeSearchTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const searchTypes_1 = require("../search/searchTypes");
const searchResultItem_1 = require("./searchResultItem");
class InformativeSearchTreeProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    currentResults = null;
    lastSearchTerm = null;
    constructor() { }
    /**
     * Update the tree with new search results
     */
    updateResults(results) {
        this.currentResults = results;
        this.lastSearchTerm = results.searchTerm;
        this._onDidChangeTreeData.fire();
    }
    /**
     * Clear all search results
     */
    clearResults() {
        this.currentResults = null;
        this.lastSearchTerm = null;
        this._onDidChangeTreeData.fire();
    }
    /**
     * Get the current search results
     */
    getCurrentResults() {
        return this.currentResults;
    }
    /**
     * Get the last search term
     */
    getLastSearchTerm() {
        return this.lastSearchTerm;
    }
    /**
     * Get tree item representation
     */
    getTreeItem(element) {
        return element;
    }
    /**
     * Get children of a tree item
     */
    getChildren(element) {
        if (!this.currentResults) {
            return Promise.resolve([]);
        }
        if (!element) {
            // Root level - return category nodes
            return Promise.resolve(this.getCategoryNodes());
        }
        else if (element.itemType === 'category') {
            // Category level - return matches in this category
            const category = element.category;
            const matches = this.currentResults.categories.get(category) || [];
            return Promise.resolve(this.getMatchNodes(matches));
        }
        else {
            // Match level - no children
            return Promise.resolve([]);
        }
    }
    /**
     * Get category nodes for the tree root
     */
    getCategoryNodes() {
        if (!this.currentResults) {
            return [];
        }
        const categoryNodes = [];
        // Sort categories by priority (defined in CATEGORY_INFO)
        const sortedCategories = Array.from(this.currentResults.categories.keys())
            .filter(category => {
            const matches = this.currentResults.categories.get(category) || [];
            return matches.length > 0;
        })
            .sort((a, b) => searchTypes_1.CATEGORY_INFO[a].priority - searchTypes_1.CATEGORY_INFO[b].priority);
        for (const category of sortedCategories) {
            const matches = this.currentResults.categories.get(category) || [];
            if (matches.length > 0) {
                const categoryInfo = searchTypes_1.CATEGORY_INFO[category];
                const item = new searchResultItem_1.SearchResultItem(`${categoryInfo.label} (${matches.length})`, vscode.TreeItemCollapsibleState.Expanded, 'category');
                item.category = category;
                item.tooltip = `${categoryInfo.description}\n${matches.length} matches found`;
                item.iconPath = new vscode.ThemeIcon(categoryInfo.icon);
                item.contextValue = 'category';
                categoryNodes.push(item);
            }
        }
        return categoryNodes;
    }
    /**
     * Get match nodes for a specific category
     */
    getMatchNodes(matches) {
        const matchNodes = [];
        // Group matches by file for better organization
        const matchesByFile = new Map();
        for (const match of matches) {
            const filePath = vscode.workspace.asRelativePath(match.file);
            const fileMatches = matchesByFile.get(filePath) || [];
            fileMatches.push(match);
            matchesByFile.set(filePath, fileMatches);
        }
        // Create tree items
        for (const [filePath, fileMatches] of matchesByFile) {
            // Sort matches by line number
            fileMatches.sort((a, b) => a.line - b.line);
            for (const match of fileMatches) {
                const lineNumber = match.line + 1; // Convert to 1-based for display
                const label = `${filePath}:${lineNumber}`;
                const item = new searchResultItem_1.SearchResultItem(label, vscode.TreeItemCollapsibleState.None, 'match');
                item.match = match;
                item.description = this.formatLinePreview(match.lineText);
                item.tooltip = this.createMatchTooltip(match);
                // Set command to open file when clicked
                item.command = {
                    command: 'informativeSearch.openFile',
                    title: 'Open File',
                    arguments: [item]
                };
                // Set icon based on file type
                const config = vscode.workspace.getConfiguration('informativeSearch');
                if (config.get('showFileIcons', true)) {
                    item.resourceUri = match.file;
                }
                item.contextValue = 'searchMatch';
                matchNodes.push(item);
            }
        }
        return matchNodes;
    }
    /**
     * Format line text for preview
     */
    formatLinePreview(lineText, maxLength = 60) {
        const trimmed = lineText.trim();
        if (trimmed.length <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, maxLength - 3) + '...';
    }
    /**
     * Create detailed tooltip for a match
     */
    createMatchTooltip(match) {
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;
        const filePath = vscode.workspace.asRelativePath(match.file);
        const lineNumber = match.line + 1;
        tooltip.appendMarkdown(`**File:** ${filePath}\n\n`);
        tooltip.appendMarkdown(`**Line:** ${lineNumber}\n\n`);
        tooltip.appendMarkdown(`**Category:** ${searchTypes_1.CATEGORY_INFO[match.category].label}\n\n`);
        // Add context information
        if (match.context.functionName) {
            tooltip.appendMarkdown(`**Function:** ${match.context.functionName}\n\n`);
        }
        if (match.context.className) {
            tooltip.appendMarkdown(`**Class:** ${match.context.className}\n\n`);
        }
        // Add code preview
        tooltip.appendMarkdown('**Code:**\n');
        tooltip.appendCodeblock(match.lineText.trim(), this.getLanguageFromFile(match.file));
        // Add surrounding context if available
        if (match.context.surroundingLines && match.context.surroundingLines.length > 1) {
            tooltip.appendMarkdown('\n**Context:**\n');
            const contextCode = match.context.surroundingLines.join('\n');
            tooltip.appendCodeblock(contextCode, this.getLanguageFromFile(match.file));
        }
        return tooltip;
    }
    /**
     * Get language identifier from file extension
     */
    getLanguageFromFile(file) {
        const extension = file.fsPath.split('.').pop()?.toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascriptreact',
            'ts': 'typescript',
            'tsx': 'typescriptreact',
            'vue': 'vue',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'md': 'markdown'
        };
        return languageMap[extension || ''] || 'text';
    }
    /**
     * Get parent of a tree item (for breadcrumb navigation)
     */
    getParent(element) {
        if (element.itemType === 'match' && element.match) {
            // Return the category parent
            const category = element.match.category;
            const categoryInfo = searchTypes_1.CATEGORY_INFO[category];
            const matches = this.currentResults?.categories.get(category) || [];
            const parentItem = new searchResultItem_1.SearchResultItem(`${categoryInfo.label} (${matches.length})`, vscode.TreeItemCollapsibleState.Expanded, 'category');
            parentItem.category = category;
            return parentItem;
        }
        return null;
    }
    /**
     * Refresh the tree view
     */
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    /**
     * Get total number of matches across all categories
     */
    getTotalMatches() {
        if (!this.currentResults) {
            return 0;
        }
        return this.currentResults.totalMatches;
    }
    /**
     * Get number of categories with matches
     */
    getCategoryCount() {
        if (!this.currentResults) {
            return 0;
        }
        let count = 0;
        for (const matches of this.currentResults.categories.values()) {
            if (matches.length > 0) {
                count++;
            }
        }
        return count;
    }
    /**
     * Filter results by category
     */
    filterByCategory(categories) {
        if (!this.currentResults) {
            return;
        }
        // Create a new filtered results object
        const filteredResults = {
            ...this.currentResults,
            categories: new Map(),
            totalMatches: 0
        };
        for (const category of categories) {
            const matches = this.currentResults.categories.get(category) || [];
            if (matches.length > 0) {
                filteredResults.categories.set(category, matches);
                filteredResults.totalMatches += matches.length;
            }
        }
        this.currentResults = filteredResults;
        this._onDidChangeTreeData.fire();
    }
    /**
     * Reset filters and show all results
     */
    clearFilters() {
        // This would require storing the original unfiltered results
        // For now, just refresh
        this._onDidChangeTreeData.fire();
    }
    /**
     * Expand all categories
     */
    expandAll() {
        // This is handled by the TreeView itself
        this._onDidChangeTreeData.fire();
    }
    /**
     * Collapse all categories
     */
    collapseAll() {
        // This is handled by the TreeView itself
        this._onDidChangeTreeData.fire();
    }
}
exports.InformativeSearchTreeProvider = InformativeSearchTreeProvider;
//# sourceMappingURL=treeViewProvider.js.map