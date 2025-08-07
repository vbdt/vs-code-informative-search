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
exports.SearchResultItem = void 0;
const vscode = __importStar(require("vscode"));
const searchTypes_1 = require("../search/searchTypes");
class SearchResultItem extends vscode.TreeItem {
    label;
    collapsibleState;
    match;
    category;
    itemType;
    constructor(label, collapsibleState, itemType) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.itemType = itemType;
        // Set different styling based on item type
        if (itemType === 'category') {
            this.contextValue = 'category';
        }
        else {
            this.contextValue = 'searchMatch';
        }
    }
    /**
     * Create a category item
     */
    static createCategoryItem(category, matchCount, label, icon) {
        const item = new SearchResultItem(`${label} (${matchCount})`, vscode.TreeItemCollapsibleState.Expanded, 'category');
        item.category = category;
        item.iconPath = new vscode.ThemeIcon(icon);
        item.contextValue = 'category';
        return item;
    }
    /**
     * Create a match item
     */
    static createMatchItem(match) {
        const filePath = vscode.workspace.asRelativePath(match.file);
        const lineNumber = match.line + 1; // Convert to 1-based
        const label = `${filePath}:${lineNumber}`;
        const item = new SearchResultItem(label, vscode.TreeItemCollapsibleState.None, 'match');
        item.match = match;
        item.description = SearchResultItem.formatLinePreview(match.lineText);
        item.tooltip = SearchResultItem.createMatchTooltip(match);
        item.resourceUri = match.file; // This enables file icons
        item.contextValue = 'searchMatch';
        // Set command to open file when clicked
        item.command = {
            command: 'informativeSearch.openFile',
            title: 'Open File',
            arguments: [item]
        };
        return item;
    }
    /**
     * Format line text for preview in the tree
     */
    static formatLinePreview(lineText, maxLength = 50) {
        const trimmed = lineText.trim();
        if (trimmed.length <= maxLength) {
            return trimmed;
        }
        // Try to break at word boundaries
        const truncated = trimmed.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.75) {
            return truncated.substring(0, lastSpace) + '...';
        }
        return truncated + '...';
    }
    /**
     * Create a detailed tooltip for a match
     */
    static createMatchTooltip(match) {
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;
        const filePath = vscode.workspace.asRelativePath(match.file);
        const lineNumber = match.line + 1; // Convert to 1-based
        const columnNumber = match.column + 1; // Convert to 1-based
        // File information
        tooltip.appendMarkdown(`**File:** \`${filePath}\`\n\n`);
        tooltip.appendMarkdown(`**Position:** Line ${lineNumber}, Column ${columnNumber}\n\n`);
        tooltip.appendMarkdown(`**Category:** ${match.category.replace(/-/g, ' ').toUpperCase()}\n\n`);
        // Context information
        if (match.context.functionName) {
            tooltip.appendMarkdown(`**Function:** \`${match.context.functionName}\`\n\n`);
        }
        if (match.context.className) {
            tooltip.appendMarkdown(`**Class:** \`${match.context.className}\`\n\n`);
        }
        // Special context for imports
        if (match.context.importedItems && match.context.importedItems.length > 0) {
            tooltip.appendMarkdown(`**Imported Items:** ${match.context.importedItems.map(item => `\`${item}\``).join(', ')}\n\n`);
        }
        // Flags for special contexts
        const flags = [];
        if (match.context.isInComment) {
            flags.push('In Comment');
        }
        if (match.context.isInString) {
            flags.push('In String');
        }
        if (flags.length > 0) {
            tooltip.appendMarkdown(`**Context Flags:** ${flags.join(', ')}\n\n`);
        }
        // Code preview
        tooltip.appendMarkdown('**Code Preview:**\n');
        const language = SearchResultItem.getLanguageFromFile(match.file);
        // Highlight the search term in the code preview
        const highlightedCode = SearchResultItem.highlightSearchTerm(match.lineText.trim(), match.searchTerm, match.column);
        tooltip.appendCodeblock(highlightedCode, language);
        // Surrounding context if available
        if (match.context.surroundingLines && match.context.surroundingLines.length > 1) {
            tooltip.appendMarkdown('\n**Surrounding Context:**\n');
            const contextCode = match.context.surroundingLines.join('\n');
            tooltip.appendCodeblock(contextCode, language);
        }
        return tooltip;
    }
    /**
     * Highlight the search term in the code preview
     */
    static highlightSearchTerm(lineText, searchTerm, column) {
        // For now, just return the original text since markdown doesn't support
        // inline highlighting in code blocks very well
        return lineText;
    }
    /**
     * Get language identifier from file extension
     */
    static getLanguageFromFile(file) {
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
            'cc': 'cpp',
            'cxx': 'cpp',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'md': 'markdown',
            'markdown': 'markdown',
            'sh': 'shellscript',
            'bash': 'shellscript',
            'zsh': 'shellscript',
            'fish': 'shellscript',
            'ps1': 'powershell',
            'sql': 'sql',
            'r': 'r',
            'scala': 'scala',
            'kt': 'kotlin',
            'swift': 'swift',
            'dart': 'dart',
            'lua': 'lua',
            'perl': 'perl',
            'pl': 'perl'
        };
        return languageMap[extension || ''] || 'text';
    }
    /**
     * Get a short description of the match type
     */
    getMatchDescription() {
        if (!this.match) {
            return '';
        }
        const category = this.match.category;
        switch (category) {
            case 'import':
                return 'Import statement';
            case 'export':
                return 'Export statement';
            case 'function-definition':
                return 'Function definition';
            case 'function-call':
                return 'Function call';
            case 'variable-declaration':
                return 'Variable declaration';
            case 'variable-usage':
                return 'Variable usage';
            case 'component-usage':
                return 'Component usage';
            case 'type-definition':
                return 'Type definition';
            case 'interface-definition':
                return 'Interface definition';
            case 'class-definition':
                return 'Class definition';
            case 'property-access':
                return 'Property access';
            case 'comment':
                return 'In comment';
            case 'string-literal':
                return 'In string';
            default:
                return 'Other usage';
        }
    }
    /**
     * Get the file name (without path) for display
     */
    getFileName() {
        if (!this.match) {
            return '';
        }
        const path = this.match.file.fsPath;
        return path.split('/').pop() || path.split('\\').pop() || path;
    }
    /**
     * Get relative file path for display
     */
    getRelativePath() {
        if (!this.match) {
            return '';
        }
        return vscode.workspace.asRelativePath(this.match.file);
    }
    /**
     * Check if this match is in the current active editor
     */
    isInActiveEditor() {
        if (!this.match) {
            return false;
        }
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return false;
        }
        return activeEditor.document.uri.fsPath === this.match.file.fsPath;
    }
    /**
     * Get a priority score for sorting (lower = higher priority)
     */
    getSortPriority() {
        if (this.itemType === 'category') {
            // Categories are sorted by their defined priority
            return this.category ?
                (Object.values(searchTypes_1.UsageCategory).indexOf(this.category) * 100) :
                9999;
        }
        else if (this.match) {
            // Matches are sorted by file path, then line number
            const filePath = this.match.file.fsPath;
            return filePath.charCodeAt(0) * 1000000 + this.match.line;
        }
        return 9999;
    }
}
exports.SearchResultItem = SearchResultItem;
//# sourceMappingURL=searchResultItem.js.map