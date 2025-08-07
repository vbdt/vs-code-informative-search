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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const searchProvider_1 = require("./search/searchProvider");
const treeViewProvider_1 = require("./views/treeViewProvider");
const searchTypes_1 = require("./search/searchTypes");
function activate(context) {
    console.log('Informative Search extension is now active!');
    // Initialize providers
    const searchProvider = new searchProvider_1.SearchProvider();
    const treeProvider = new treeViewProvider_1.InformativeSearchTreeProvider();
    // Register tree view
    const treeView = vscode.window.createTreeView('informativeSearchResults', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
        canSelectMany: false
    });
    // Set initial context values
    vscode.commands.executeCommand('setContext', 'informativeSearch:hasResults', false);
    // Register commands
    const searchCommand = vscode.commands.registerCommand('informativeSearch.search', async () => {
        await performWorkspaceSearch(searchProvider, treeProvider);
    });
    const searchCurrentFileCommand = vscode.commands.registerCommand('informativeSearch.searchCurrentFile', async () => {
        await performCurrentFileSearch(searchProvider, treeProvider);
    });
    const searchSelectedTextCommand = vscode.commands.registerCommand('informativeSearch.searchSelectedText', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            if (selectedText.trim()) {
                await performWorkspaceSearch(searchProvider, treeProvider, selectedText);
            }
        }
    });
    const clearResultsCommand = vscode.commands.registerCommand('informativeSearch.clearResults', () => {
        treeProvider.clearResults();
        vscode.commands.executeCommand('setContext', 'informativeSearch:hasResults', false);
        vscode.window.showInformationMessage('Search results cleared');
    });
    const refreshResultsCommand = vscode.commands.registerCommand('informativeSearch.refreshResults', async () => {
        const lastSearchTerm = treeProvider.getLastSearchTerm();
        if (lastSearchTerm) {
            await performWorkspaceSearch(searchProvider, treeProvider, lastSearchTerm);
        }
        else {
            vscode.window.showInformationMessage('No previous search to refresh');
        }
    });
    const exportResultsCommand = vscode.commands.registerCommand('informativeSearch.exportResults', async () => {
        const results = treeProvider.getCurrentResults();
        if (results) {
            await exportSearchResults(results);
        }
        else {
            vscode.window.showInformationMessage('No search results to export');
        }
    });
    const openSearchSettingsCommand = vscode.commands.registerCommand('informativeSearch.openSearchSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'informativeSearch');
    });
    // Context menu commands for tree items
    const openFileCommand = vscode.commands.registerCommand('informativeSearch.openFile', async (item) => {
        if (item && item.match) {
            const document = await vscode.workspace.openTextDocument(item.match.file);
            const editor = await vscode.window.showTextDocument(document);
            const position = new vscode.Position(item.match.line, item.match.column);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(item.match.range);
        }
    });
    const openFileToSideCommand = vscode.commands.registerCommand('informativeSearch.openFileToSide', async (item) => {
        if (item && item.match) {
            const document = await vscode.workspace.openTextDocument(item.match.file);
            const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
            const position = new vscode.Position(item.match.line, item.match.column);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(item.match.range);
        }
    });
    const copyPathCommand = vscode.commands.registerCommand('informativeSearch.copyPath', (item) => {
        if (item && item.match) {
            const relativePath = vscode.workspace.asRelativePath(item.match.file);
            vscode.env.clipboard.writeText(relativePath);
            vscode.window.showInformationMessage(`Copied path: ${relativePath}`);
        }
    });
    const copyLineContentCommand = vscode.commands.registerCommand('informativeSearch.copyLineContent', (item) => {
        if (item && item.match) {
            vscode.env.clipboard.writeText(item.match.lineText);
            vscode.window.showInformationMessage('Copied line content to clipboard');
        }
    });
    // Handle tree item selection
    treeView.onDidChangeSelection(async (event) => {
        if (event.selection.length > 0) {
            const item = event.selection[0];
            if (item.match) {
                // Auto-open file when clicking on a match
                vscode.commands.executeCommand('informativeSearch.openFile', item);
            }
        }
    });
    // Register all disposables
    context.subscriptions.push(searchCommand, searchCurrentFileCommand, searchSelectedTextCommand, clearResultsCommand, refreshResultsCommand, exportResultsCommand, openSearchSettingsCommand, openFileCommand, openFileToSideCommand, copyPathCommand, copyLineContentCommand, treeView);
    // Show welcome message on first activation
    const isFirstActivation = context.globalState.get('informativeSearch.firstActivation', true);
    if (isFirstActivation) {
        vscode.window.showInformationMessage('Informative Search is ready! Use Ctrl+Shift+F to start searching.', 'Open Search', 'Settings').then(selection => {
            if (selection === 'Open Search') {
                vscode.commands.executeCommand('informativeSearch.search');
            }
            else if (selection === 'Settings') {
                vscode.commands.executeCommand('informativeSearch.openSearchSettings');
            }
        });
        context.globalState.update('informativeSearch.firstActivation', false);
    }
}
/**
 * Perform a workspace-wide search
 */
async function performWorkspaceSearch(searchProvider, treeProvider, searchTerm) {
    if (!searchTerm) {
        searchTerm = await vscode.window.showInputBox({
            prompt: 'Enter search term',
            placeHolder: 'Search for functions, variables, imports...',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Search term cannot be empty';
                }
                if (value.trim().length < 2) {
                    return 'Search term must be at least 2 characters';
                }
                return null;
            }
        });
    }
    if (!searchTerm || searchTerm.trim().length === 0) {
        return;
    }
    const config = getSearchConfiguration();
    try {
        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Searching for "${searchTerm}"...`,
            cancellable: true
        }, async (progress, token) => {
            // Update progress
            progress.report({ message: 'Scanning files...' });
            const results = await searchProvider.searchInWorkspace(searchTerm, config, (filesSearched, totalFiles) => {
                const percentage = Math.round((filesSearched / totalFiles) * 100);
                progress.report({
                    message: `Searched ${filesSearched}/${totalFiles} files (${percentage}%)`,
                    increment: percentage
                });
            }, token);
            if (token.isCancellationRequested) {
                vscode.window.showInformationMessage('Search cancelled');
                return;
            }
            // Update tree view
            treeProvider.updateResults(results);
            vscode.commands.executeCommand('setContext', 'informativeSearch:hasResults', results.totalMatches > 0);
            // Show summary
            const message = `Found ${results.totalMatches} matches in ${results.searchedFiles} files (${results.searchTime}ms)`;
            vscode.window.showInformationMessage(message);
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('Search error:', error);
    }
}
/**
 * Perform a search in the current file only
 */
async function performCurrentFileSearch(searchProvider, treeProvider, searchTerm) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor to search in');
        return;
    }
    if (!searchTerm) {
        searchTerm = await vscode.window.showInputBox({
            prompt: 'Enter search term for current file',
            placeHolder: 'Search in current file...',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Search term cannot be empty';
                }
                return null;
            }
        });
    }
    if (!searchTerm || searchTerm.trim().length === 0) {
        return;
    }
    const config = getSearchConfiguration();
    try {
        const results = await searchProvider.searchInFile(editor.document, searchTerm, config);
        // Update tree view
        treeProvider.updateResults(results);
        vscode.commands.executeCommand('setContext', 'informativeSearch:hasResults', results.totalMatches > 0);
        // Show summary
        const fileName = vscode.workspace.asRelativePath(editor.document.uri);
        const message = `Found ${results.totalMatches} matches in ${fileName} (${results.searchTime}ms)`;
        vscode.window.showInformationMessage(message);
    }
    catch (error) {
        vscode.window.showErrorMessage(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('Search error:', error);
    }
}
/**
 * Get search configuration from VS Code settings
 */
function getSearchConfiguration() {
    const config = vscode.workspace.getConfiguration('informativeSearch');
    return {
        includePatterns: config.get('includePatterns', searchTypes_1.DEFAULT_SEARCH_CONFIG.includePatterns),
        excludePatterns: config.get('excludePatterns', searchTypes_1.DEFAULT_SEARCH_CONFIG.excludePatterns),
        includeComments: config.get('includeComments', searchTypes_1.DEFAULT_SEARCH_CONFIG.includeComments),
        includeStringLiterals: config.get('includeStringLiterals', searchTypes_1.DEFAULT_SEARCH_CONFIG.includeStringLiterals),
        caseSensitive: config.get('caseSensitive', searchTypes_1.DEFAULT_SEARCH_CONFIG.caseSensitive),
        useRegex: config.get('useRegex', searchTypes_1.DEFAULT_SEARCH_CONFIG.useRegex),
        maxResultsPerCategory: config.get('maxResultsPerCategory', searchTypes_1.DEFAULT_SEARCH_CONFIG.maxResultsPerCategory)
    };
}
/**
 * Export search results to a file
 */
async function exportSearchResults(results) {
    const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.joinPath(vscode.workspace.workspaceFolders?.[0]?.uri || vscode.Uri.file('.'), `search-results-${results.searchTerm}-${Date.now()}.md`),
        filters: {
            'Markdown': ['md'],
            'JSON': ['json'],
            'Text': ['txt']
        }
    });
    if (!saveUri) {
        return;
    }
    try {
        let content = '';
        const extension = saveUri.path.split('.').pop()?.toLowerCase();
        if (extension === 'json') {
            // Export as JSON
            const exportData = {
                searchTerm: results.searchTerm,
                totalMatches: results.totalMatches,
                searchedFiles: results.searchedFiles,
                searchTime: results.searchTime,
                timestamp: new Date().toISOString(),
                categories: Array.from(results.categories.entries()).map(([category, matches]) => ({
                    category,
                    count: matches.length,
                    matches: matches.map(match => ({
                        file: vscode.workspace.asRelativePath(match.file),
                        line: match.line + 1, // Convert to 1-based
                        column: match.column + 1, // Convert to 1-based
                        lineText: match.lineText.trim(),
                        category: match.category
                    }))
                }))
            };
            content = JSON.stringify(exportData, null, 2);
        }
        else {
            // Export as Markdown
            content = `# Search Results for "${results.searchTerm}"\n\n`;
            content += `**Total Matches:** ${results.totalMatches}\n`;
            content += `**Files Searched:** ${results.searchedFiles}\n`;
            content += `**Search Time:** ${results.searchTime}ms\n`;
            content += `**Generated:** ${new Date().toLocaleString()}\n\n`;
            // Group results by category
            for (const [category, matches] of results.categories) {
                if (matches.length === 0)
                    continue;
                content += `## ${category.toUpperCase().replace(/-/g, ' ')} (${matches.length})\n\n`;
                for (const match of matches) {
                    const relativePath = vscode.workspace.asRelativePath(match.file);
                    const lineNumber = match.line + 1; // Convert to 1-based
                    content += `- **${relativePath}:${lineNumber}** - ${match.lineText.trim()}\n`;
                }
                content += '\n';
            }
        }
        await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf8'));
        const openFile = await vscode.window.showInformationMessage(`Search results exported to ${vscode.workspace.asRelativePath(saveUri)}`, 'Open File');
        if (openFile === 'Open File') {
            await vscode.window.showTextDocument(saveUri);
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to export results: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('Export error:', error);
    }
}
function deactivate() {
    console.log('Informative Search extension is now deactivated');
}
//# sourceMappingURL=extension.js.map