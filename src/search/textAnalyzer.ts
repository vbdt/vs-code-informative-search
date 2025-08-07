import { UsageCategory, MatchContext } from './searchTypes';

export class TextAnalyzer {

    /**
     * Categorize a match based on its context
     */
    categorizeMatch(
        lineText: string,
        columnIndex: number,
        searchTerm: string,
        context: MatchContext,
        allLines: string[],
        lineNumber: number,
        languageId: string
    ): UsageCategory {
        const trimmedLine = lineText.trim();
        const beforeMatch = lineText.substring(0, columnIndex).trim();
        const afterMatch = lineText.substring(columnIndex + searchTerm.length).trim();

        // Handle comments first
        if (context.isInComment) {
            return UsageCategory.COMMENT;
        }

        // Handle string literals
        if (context.isInString) {
            return UsageCategory.STRING_LITERAL;
        }

        // Check for imports
        if (this.isImportStatement(trimmedLine, searchTerm)) {
            return UsageCategory.IMPORT;
        }

        // Check for exports
        if (this.isExportStatement(trimmedLine, searchTerm)) {
            return UsageCategory.EXPORT;
        }

        // Check for function definitions
        if (this.isFunctionDefinition(trimmedLine, searchTerm, beforeMatch, afterMatch, languageId)) {
            return UsageCategory.FUNCTION_DEFINITION;
        }

        // Check for variable declarations
        if (this.isVariableDeclaration(trimmedLine, searchTerm, beforeMatch, afterMatch, languageId)) {
            return UsageCategory.VARIABLE_DECLARATION;
        }

        // Check for function calls
        if (this.isFunctionCall(trimmedLine, searchTerm, afterMatch)) {
            return UsageCategory.FUNCTION_CALL;
        }

        // Check for component usage (React/Vue)
        if (this.isComponentUsage(trimmedLine, searchTerm, languageId)) {
            return UsageCategory.COMPONENT_USAGE;
        }

        // Check for type definitions
        if (this.isTypeDefinition(trimmedLine, searchTerm, beforeMatch, languageId)) {
            return UsageCategory.TYPE_DEFINITION;
        }

        // Check for interface definitions
        if (this.isInterfaceDefinition(trimmedLine, searchTerm, beforeMatch, languageId)) {
            return UsageCategory.INTERFACE_DEFINITION;
        }

        // Check for class definitions
        if (this.isClassDefinition(trimmedLine, searchTerm, beforeMatch, languageId)) {
            return UsageCategory.CLASS_DEFINITION;
        }

        // Check for property access
        if (this.isPropertyAccess(trimmedLine, searchTerm, beforeMatch, afterMatch)) {
            return UsageCategory.PROPERTY_ACCESS;
        }

        // Check for variable usage
        if (this.isVariableUsage(trimmedLine, searchTerm, beforeMatch, afterMatch)) {
            return UsageCategory.VARIABLE_USAGE;
        }

        return UsageCategory.OTHER;
    }

    /**
     * Get context information for a match
     */
    getMatchContext(
        lineText: string,
        columnIndex: number,
        allLines: string[],
        lineNumber: number
    ): MatchContext {
        const context: MatchContext = {
            isInComment: this.isInComment(lineText, columnIndex),
            isInString: this.isInString(lineText, columnIndex),
            surroundingLines: this.getSurroundingLines(allLines, lineNumber, 2)
        };

        // Get function context
        context.functionName = this.getFunctionContext(allLines, lineNumber);
        
        // Get class context
        context.className = this.getClassContext(allLines, lineNumber);

        // Additional analysis for specific contexts
        if (this.isImportStatement(lineText.trim(), '')) {
            context.importedItems = this.extractImportedItems(lineText);
        }

        return context;
    }

    /**
     * Check if position is inside a comment
     */
    private isInComment(lineText: string, columnIndex: number): boolean {
        // Single line comments
        const singleLineComment = lineText.indexOf('//');
        if (singleLineComment !== -1 && singleLineComment <= columnIndex) {
            return true;
        }

        // Multi-line comments (basic check)
        const beforeText = lineText.substring(0, columnIndex);
        const afterText = lineText.substring(columnIndex);
        
        const multiLineStart = beforeText.lastIndexOf('/*');
        const multiLineEnd = afterText.indexOf('*/');
        
        if (multiLineStart !== -1 && multiLineEnd !== -1) {
            return true;
        }

        // Check for other comment patterns based on language
        if (lineText.trim().startsWith('#')) { // Python, shell scripts
            return true;
        }

        return false;
    }

    /**
     * Check if position is inside a string literal
     */
    private isInString(lineText: string, columnIndex: number): boolean {
        const beforeText = lineText.substring(0, columnIndex);
        
        // Count unescaped quotes
        let singleQuotes = 0;
        let doubleQuotes = 0;
        let backticks = 0;
        
        for (let i = 0; i < beforeText.length; i++) {
            if (beforeText[i] === '\'' && (i === 0 || beforeText[i - 1] !== '\\')) {
                singleQuotes++;
            } else if (beforeText[i] === '"' && (i === 0 || beforeText[i - 1] !== '\\')) {
                doubleQuotes++;
            } else if (beforeText[i] === '`' && (i === 0 || beforeText[i - 1] !== '\\')) {
                backticks++;
            }
        }

        return (singleQuotes % 2 === 1) || (doubleQuotes % 2 === 1) || (backticks % 2 === 1);
    }

    /**
     * Check if this is an import statement
     */
    private isImportStatement(line: string, searchTerm: string): boolean {
        const patterns = [
            /^import\s+.*from\s+/,
            /^import\s+.*=\s+require/,
            /^const\s+.*=\s+require/,
            /^from\s+.*import/,  // Python
            /^#include\s+/,      // C/C++
            /^using\s+/          // C#
        ];

        return patterns.some(pattern => pattern.test(line));
    }

    /**
     * Check if this is an export statement
     */
    private isExportStatement(line: string, searchTerm: string): boolean {
        const patterns = [
            /^export\s+(default\s+)?/,
            /^export\s*\{/,
            /^module\.exports\s*=/
        ];

        return patterns.some(pattern => pattern.test(line));
    }

    /**
     * Check if this is a function definition
     */
    private isFunctionDefinition(
        line: string, 
        searchTerm: string, 
        beforeMatch: string, 
        afterMatch: string, 
        languageId: string
    ): boolean {
        // JavaScript/TypeScript patterns
        const jsPatterns = [
            /^function\s+/, // function name()
            /^const\s+.*=\s*\(.*\)\s*=>/, // const name = () =>
            /^const\s+.*=\s*function/, // const name = function
            /^.*:\s*\(.*\)\s*=>/, // name: () =>
            /^async\s+function\s+/, // async function name()
        ];

        // Python patterns
        const pyPatterns = [
            /^def\s+/, // def name():
            /^async\s+def\s+/ // async def name():
        ];

        // Java/C# patterns
        const javaPatterns = [
            /^\s*(public|private|protected|static).*\s+\w+\s*\(/
        ];

        let patterns = jsPatterns;
        if (languageId === 'python') {
            patterns = pyPatterns;
        } else if (languageId === 'java' || languageId === 'csharp') {
            patterns = javaPatterns;
        }

        // Check if the search term is followed by parentheses (function signature)
        if (afterMatch.startsWith('(')) {
            return true;
        }

        return patterns.some(pattern => pattern.test(line));
    }

    /**
     * Check if this is a variable declaration
     */
    private isVariableDeclaration(
        line: string, 
        searchTerm: string, 
        beforeMatch: string, 
        afterMatch: string, 
        languageId: string
    ): boolean {
        const jsPatterns = [
            /^(const|let|var)\s+/,
            /^.*:\s*[A-Za-z]/  // TypeScript type annotation
        ];

        const pyPatterns = [
            /^\s*\w+\s*=/ // variable assignment
        ];

        let patterns = jsPatterns;
        if (languageId === 'python') {
            patterns = pyPatterns;
        }

        // Check if assignment follows
        if (afterMatch.startsWith('=') || afterMatch.startsWith(':')) {
            return true;
        }

        return patterns.some(pattern => pattern.test(line));
    }

    /**
     * Check if this is a function call
     */
    private isFunctionCall(line: string, searchTerm: string, afterMatch: string): boolean {
        // Look for opening parenthesis after the search term
        return afterMatch.trimLeft().startsWith('(');
    }

    /**
     * Check if this is a component usage (React/Vue)
     */
    private isComponentUsage(line: string, searchTerm: string, languageId: string): boolean {
        if (languageId !== 'typescriptreact' && languageId !== 'javascriptreact' && languageId !== 'vue') {
            return false;
        }

        // React component patterns
        const reactPatterns = [
            new RegExp(`<${searchTerm}[\\s/>]`),
            new RegExp(`</${searchTerm}>`),
        ];

        return reactPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Check if this is a type definition
     */
    private isTypeDefinition(line: string, searchTerm: string, beforeMatch: string, languageId: string): boolean {
        if (languageId !== 'typescript' && languageId !== 'typescriptreact') {
            return false;
        }

        const patterns = [
            /^type\s+/,
            /^export\s+type\s+/
        ];

        return patterns.some(pattern => pattern.test(line));
    }

    /**
     * Check if this is an interface definition
     */
    private isInterfaceDefinition(line: string, searchTerm: string, beforeMatch: string, languageId: string): boolean {
        if (languageId !== 'typescript' && languageId !== 'typescriptreact') {
            return false;
        }

        const patterns = [
            /^interface\s+/,
            /^export\s+interface\s+/
        ];

        return patterns.some(pattern => pattern.test(line));
    }

    /**
     * Check if this is a class definition
     */
    private isClassDefinition(line: string, searchTerm: string, beforeMatch: string, languageId: string): boolean {
        const patterns = [
            /^class\s+/,
            /^export\s+class\s+/,
            /^abstract\s+class\s+/,
            /^public\s+class\s+/, // Java/C#
            /^private\s+class\s+/
        ];

        return patterns.some(pattern => pattern.test(line));
    }

    /**
     * Check if this is property access
     */
    private isPropertyAccess(line: string, searchTerm: string, beforeMatch: string, afterMatch: string): boolean {
        // Check for dot notation
        if (beforeMatch.endsWith('.') || afterMatch.startsWith('.')) {
            return true;
        }

        // Check for bracket notation
        if (beforeMatch.endsWith('[') && afterMatch.startsWith(']')) {
            return true;
        }

        return false;
    }

    /**
     * Check if this is variable usage
     */
    private isVariableUsage(line: string, searchTerm: string, beforeMatch: string, afterMatch: string): boolean {
        // This is a catch-all for variable references that don't fit other categories
        // Check that it's not a declaration and not followed by function call syntax
        
        const isNotDeclaration = !beforeMatch.match(/^(const|let|var|function)\s*$/);
        const isNotFunctionCall = !afterMatch.trimLeft().startsWith('(');
        const isNotPropertyAccess = !beforeMatch.endsWith('.') && !beforeMatch.endsWith('[');

        return isNotDeclaration && isNotFunctionCall && isNotPropertyAccess;
    }

    /**
     * Get surrounding lines for context
     */
    private getSurroundingLines(allLines: string[], lineNumber: number, radius: number): string[] {
        const start = Math.max(0, lineNumber - radius);
        const end = Math.min(allLines.length, lineNumber + radius + 1);
        
        return allLines.slice(start, end);
    }

    /**
     * Get the name of the function containing this line
     */
    private getFunctionContext(allLines: string[], lineNumber: number): string | undefined {
        // Look backwards for function definition
        for (let i = lineNumber; i >= 0; i--) {
            const line = allLines[i].trim();
            
            // JavaScript/TypeScript function patterns
            const functionMatch = line.match(/^(async\s+)?function\s+(\w+)\s*\(/);
            if (functionMatch) {
                return functionMatch[2];
            }

            // Arrow function patterns
            const arrowMatch = line.match(/^(const|let|var)\s+(\w+)\s*=\s*.*=>/);
            if (arrowMatch) {
                return arrowMatch[2];
            }

            // Method patterns
            const methodMatch = line.match(/^(\w+)\s*\(/);
            if (methodMatch && !line.includes('if') && !line.includes('for') && !line.includes('while')) {
                return methodMatch[1];
            }
        }

        return undefined;
    }

    /**
     * Get the name of the class containing this line
     */
    private getClassContext(allLines: string[], lineNumber: number): string | undefined {
        // Look backwards for class definition
        for (let i = lineNumber; i >= 0; i--) {
            const line = allLines[i].trim();
            
            const classMatch = line.match(/^(export\s+)?(abstract\s+)?class\s+(\w+)/);
            if (classMatch) {
                return classMatch[3];
            }
        }

        return undefined;
    }

    /**
     * Extract imported items from an import statement
     */
    private extractImportedItems(line: string): string[] {
        const items: string[] = [];
        
        // Named imports: import { a, b, c } from 'module'
        const namedMatch = line.match(/import\s*\{\s*([^}]+)\s*\}/);
        if (namedMatch) {
            return namedMatch[1].split(',').map(item => item.trim());
        }

        // Default import: import something from 'module'
        const defaultMatch = line.match(/import\s+(\w+)\s+from/);
        if (defaultMatch) {
            items.push(defaultMatch[1]);
        }

        // Namespace import: import * as something from 'module'
        const namespaceMatch = line.match(/import\s+\*\s+as\s+(\w+)\s+from/);
        if (namespaceMatch) {
            items.push(namespaceMatch[1]);
        }

        return items;
    }
}