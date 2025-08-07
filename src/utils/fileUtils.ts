import * as vscode from 'vscode';
import * as path from 'path';

export class FileUtils {
    
    /**
     * Check if a file should be included in search based on patterns
     */
    static shouldIncludeFile(filePath: string, includePatterns: string[], excludePatterns: string[]): boolean {
        const fileName = path.basename(filePath);
        const relativePath = vscode.workspace.asRelativePath(filePath);
        
        // Check exclude patterns first
        for (const pattern of excludePatterns) {
            if (this.matchesPattern(relativePath, pattern) || this.matchesPattern(fileName, pattern)) {
                return false;
            }
        }
        
        // Check include patterns
        for (const pattern of includePatterns) {
            if (this.matchesPattern(relativePath, pattern) || this.matchesPattern(fileName, pattern)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if a file path matches a glob pattern
     */
    private static matchesPattern(filePath: string, pattern: string): boolean {
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '.');
        
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(filePath);
    }
    
    /**
     * Get file extension from file path
     */
    static getFileExtension(filePath: string): string {
        return path.extname(filePath).toLowerCase().substring(1);
    }
    
    /**
     * Check if file is a text file that can be searched
     */
    static isTextFile(filePath: string): boolean {
        const extension = this.getFileExtension(filePath);
        
        const textExtensions = [
            'js', 'jsx', 'ts', 'tsx', 'vue', 'py', 'java', 'c', 'cpp', 'cc', 'cxx',
            'cs', 'php', 'rb', 'go', 'rs', 'html', 'htm', 'css', 'scss', 'sass',
            'less', 'json', 'xml', 'yaml', 'yml', 'md', 'markdown', 'txt', 'sh',
            'bash', 'zsh', 'fish', 'ps1', 'sql', 'r', 'scala', 'kt', 'swift',
            'dart', 'lua', 'perl', 'pl', 'dockerfile', 'gitignore', 'env'
        ];
        
        return textExtensions.includes(extension);
    }
    
    /**
     * Check if file is binary
     */
    static isBinaryFile(filePath: string): boolean {
        const extension = this.getFileExtension(filePath);
        
        const binaryExtensions = [
            'exe', 'dll', 'so', 'dylib', 'bin', 'jpg', 'jpeg', 'png', 'gif',
            'bmp', 'ico', 'svg', 'webp', 'pdf', 'zip', 'tar', 'gz', 'rar',
            '7z', 'mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'wav', 'ogg'
        ];
        
        return binaryExtensions.includes(extension);
    }
    
    /**
     * Get language identifier from file path
     */
    static getLanguageId(filePath: string): string {
        const extension = this.getFileExtension(filePath);
        
        const languageMap: { [key: string]: string } = {
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
            'txt': 'plaintext',
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
            'pl': 'perl',
            'dockerfile': 'dockerfile'
        };
        
        return languageMap[extension] || 'plaintext';
    }
    
    /**
     * Read file content safely
     */
    static async readFileContent(uri: vscode.Uri): Promise<string> {
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            return document.getText();
        } catch (error) {
            console.error(`Failed to read file ${uri.fsPath}:`, error);
            return '';
        }
    }
    
    /**
     * Get workspace relative path
     */
    static getRelativePath(uri: vscode.Uri): string {
        return vscode.workspace.asRelativePath(uri);
    }
    
    /**
     * Get file size in bytes
     */
    static async getFileSize(uri: vscode.Uri): Promise<number> {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            return stat.size;
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * Check if file is too large to search efficiently
     */
    static async isFileTooBig(uri: vscode.Uri, maxSize: number = 1024 * 1024): Promise<boolean> {
        const size = await this.getFileSize(uri);
        return size > maxSize;
    }
    
    /**
     * Get file modification time
     */
    static async getFileModTime(uri: vscode.Uri): Promise<Date | null> {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            return new Date(stat.mtime);
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Create a backup file path for exports
     */
    static createBackupPath(originalPath: string, suffix: string = 'backup'): string {
        const parsedPath = path.parse(originalPath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return path.join(
            parsedPath.dir,
            `${parsedPath.name}_${suffix}_${timestamp}${parsedPath.ext}`
        );
    }
    
    /**
     * Ensure directory exists for a file path
     */
    static async ensureDirectoryExists(filePath: string): Promise<void> {
        const dir = path.dirname(filePath);
        try {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));
        } catch (error) {
            // Directory might already exist, ignore error
        }
    }
    
    /**
     * Get all workspace folders
     */
    static getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] {
        return vscode.workspace.workspaceFolders || [];
    }
    
    /**
     * Find the workspace folder containing a file
     */
    static findWorkspaceFolder(uri: vscode.Uri): vscode.WorkspaceFolder | undefined {
        return vscode.workspace.getWorkspaceFolder(uri);
    }
    
    /**
     * Check if a path is within the workspace
     */
    static isInWorkspace(filePath: string): boolean {
        const workspaceFolders = this.getWorkspaceFolders();
        return workspaceFolders.some(folder => 
            filePath.startsWith(folder.uri.fsPath)
        );
    }
    
    /**
     * Get common file patterns for different project types
     */
    static getCommonFilePatterns(projectType: string): { include: string[], exclude: string[] } {
        const patterns: { [key: string]: { include: string[], exclude: string[] } } = {
            'javascript': {
                include: ['**/*.{js,jsx,ts,tsx,json}'],
                exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.min.js']
            },
            'python': {
                include: ['**/*.{py,pyx,pyi}'],
                exclude: ['**/__pycache__/**', '**/venv/**', '**/env/**', '**/*.pyc']
            },
            'java': {
                include: ['**/*.{java,kt,scala}'],
                exclude: ['**/target/**', '**/build/**', '**/*.class']
            },
            'csharp': {
                include: ['**/*.{cs,vb,fs}'],
                exclude: ['**/bin/**', '**/obj/**', '**/packages/**']
            },
            'web': {
                include: ['**/*.{html,css,scss,sass,less,js,ts,jsx,tsx,vue}'],
                exclude: ['**/node_modules/**', '**/dist/**', '**/*.min.{js,css}']
            }
        };
        
        return patterns[projectType] || {
            include: ['**/*'],
            exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/target/**']
        };
    }
    
    /**
     * Detect project type based on files in workspace
     */
    static async detectProjectType(): Promise<string> {
        const workspaceFolders = this.getWorkspaceFolders();
        if (workspaceFolders.length === 0) {
            return 'unknown';
        }
        
        const rootFolder = workspaceFolders[0];
        
        try {
            // Check for common project files
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(rootFolder, '{package.json,pom.xml,*.csproj,requirements.txt,Cargo.toml,go.mod}'),
                null,
                10
            );
            
            for (const file of files) {
                const fileName = path.basename(file.fsPath).toLowerCase();
                
                if (fileName === 'package.json') return 'javascript';
                if (fileName === 'pom.xml') return 'java';
                if (fileName.endsWith('.csproj')) return 'csharp';
                if (fileName === 'requirements.txt') return 'python';
                if (fileName === 'cargo.toml') return 'rust';
                if (fileName === 'go.mod') return 'go';
            }
            
            // Check for common file extensions
            const codeFiles = await vscode.workspace.findFiles(
                new vscode.RelativePattern(rootFolder, '**/*.{js,ts,py,java,cs,cpp,go,rs}'),
                '**/node_modules/**',
                20
            );
            
            const extensionCounts: { [key: string]: number } = {};
            
            for (const file of codeFiles) {
                const ext = this.getFileExtension(file.fsPath);
                extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
            }
            
            // Return the most common extension's project type
            const mostCommonExt = Object.keys(extensionCounts)
                .reduce((a, b) => extensionCounts[a] > extensionCounts[b] ? a : b, '');
            
            const extToProjectType: { [key: string]: string } = {
                'js': 'javascript', 'ts': 'javascript', 'jsx': 'javascript', 'tsx': 'javascript',
                'py': 'python',
                'java': 'java',
                'cs': 'csharp',
                'cpp': 'cpp', 'c': 'cpp',
                'go': 'go',
                'rs': 'rust'
            };
            
            return extToProjectType[mostCommonExt] || 'unknown';
            
        } catch (error) {
            console.error('Failed to detect project type:', error);
            return 'unknown';
        }
    }
    
    /**
     * Format file size for display
     */
    static formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    }
    
    /**
     * Sanitize file name for safe file system operations
     */
    static sanitizeFileName(fileName: string): string {
        // Remove or replace invalid characters
        return fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
                      .replace(/\s+/g, '_')
                      .replace(/_{2,}/g, '_')
                      .trim();
    }
}