/**
 * Type definitions for the Informative Search extension
 */

import * as vscode from 'vscode';

/**
 * Categories for different types of code usage
 */
export enum UsageCategory {
  IMPORT = 'import',
  EXPORT = 'export',
  FUNCTION_DEFINITION = 'function-definition',
  FUNCTION_CALL = 'function-call',
  VARIABLE_DECLARATION = 'variable-declaration',
  VARIABLE_USAGE = 'variable-usage',
  COMPONENT_USAGE = 'component-usage',
  TYPE_DEFINITION = 'type-definition',
  INTERFACE_DEFINITION = 'interface-definition',
  CLASS_DEFINITION = 'class-definition',
  PROPERTY_ACCESS = 'property-access',
  COMMENT = 'comment',
  STRING_LITERAL = 'string-literal',
  OTHER = 'other'
}

/**
 * Represents a single search match with its context
 */
export interface SearchMatch {
  /** The search term that was matched */
  searchTerm: string;
  /** File where the match was found */
  file: vscode.Uri;
  /** Line number (0-based) */
  line: number;
  /** Column number (0-based) */
  column: number;
  /** The full line text containing the match */
  lineText: string;
  /** Category of usage */
  category: UsageCategory;
  /** Additional context information */
  context: MatchContext;
  /** Range of the match in the document */
  range: vscode.Range;
}

/**
 * Additional context information for a match
 */
export interface MatchContext {
  /** Function name if inside a function */
  functionName?: string;
  /** Class name if inside a class */
  className?: string;
  /** Whether it's inside a comment */
  isInComment: boolean;
  /** Whether it's inside a string literal */
  isInString: boolean;
  /** The surrounding code context (few lines before/after) */
  surroundingLines?: string[];
  /** If it's an import, what's being imported */
  importedItems?: string[];
  /** If it's a function call, the arguments */
  functionArguments?: string[];
}

/**
 * Grouped search results by category
 */
export interface CategorizedResults {
  /** The search term */
  searchTerm: string;
  /** Total number of matches found */
  totalMatches: number;
  /** Results grouped by category */
  categories: Map<UsageCategory, SearchMatch[]>;
  /** Files that were searched */
  searchedFiles: number;
  /** Time taken for the search (in milliseconds) */
  searchTime: number;
}

/**
 * Configuration for the search behavior
 */
export interface SearchConfiguration {
  /** File patterns to include in search */
  includePatterns: string[];
  /** File patterns to exclude from search */
  excludePatterns: string[];
  /** Whether to include comments in search */
  includeComments: boolean;
  /** Whether to include string literals in search */
  includeStringLiterals: boolean;
  /** Whether to use case-sensitive search */
  caseSensitive: boolean;
  /** Whether to use regex search */
  useRegex: boolean;
  /** Maximum number of results per category */
  maxResultsPerCategory: number;
}

/**
 * Tree item data for the VS Code tree view
 */
export interface SearchTreeItemData {
  /** Type of tree item */
  type: 'category' | 'match' | 'file';
  /** Display label */
  label: string;
  /** Optional description */
  description?: string;
  /** Category if this is a category item */
  category?: UsageCategory;
  /** Search match if this is a match item */
  match?: SearchMatch;
  /** Child items count */
  childCount?: number;
  /** VS Code tree item collapsible state */
  collapsibleState: vscode.TreeItemCollapsibleState;
}

/**
 * Events that can be emitted by the search provider
 */
export interface SearchEvents {
  /** Emitted when search starts */
  searchStarted: { searchTerm: string };
  /** Emitted when search completes */
  searchCompleted: { results: CategorizedResults };
  /** Emitted when search fails */
  searchFailed: { error: Error; searchTerm: string };
  /** Emitted for search progress updates */
  searchProgress: { filesSearched: number; totalFiles: number };
}

/**
 * Default search configuration
 */
export const DEFAULT_SEARCH_CONFIG: SearchConfiguration = {
  includePatterns: ['**/*.{js,ts,jsx,tsx,vue,py,java,c,cpp,cs,php,rb,go,rs}'],
  excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.min.js'],
  includeComments: true,
  includeStringLiterals: false,
  caseSensitive: false,
  useRegex: false,
  maxResultsPerCategory: 100
};

/**
 * Category display information
 */
export interface CategoryInfo {
  label: string;
  description: string;
  icon: string;
  priority: number; // Lower number = higher priority in display
}

/**
 * Category display configuration
 */
export const CATEGORY_INFO: Record<UsageCategory, CategoryInfo> = {
  [UsageCategory.IMPORT]: {
    label: 'Imports',
    description: 'Import statements',
    icon: 'arrow-down',
    priority: 1
  },
  [UsageCategory.EXPORT]: {
    label: 'Exports',
    description: 'Export statements',
    icon: 'arrow-up',
    priority: 2
  },
  [UsageCategory.FUNCTION_DEFINITION]: {
    label: 'Function Definitions',
    description: 'Function declarations and definitions',
    icon: 'symbol-function',
    priority: 3
  },
  [UsageCategory.FUNCTION_CALL]: {
    label: 'Function Calls',
    description: 'Function invocations',
    icon: 'play',
    priority: 4
  },
  [UsageCategory.VARIABLE_DECLARATION]: {
    label: 'Variable Declarations',
    description: 'Variable declarations and assignments',
    icon: 'symbol-variable',
    priority: 5
  },
  [UsageCategory.VARIABLE_USAGE]: {
    label: 'Variable Usage',
    description: 'Variable references and usage',
    icon: 'symbol-field',
    priority: 6
  },
  [UsageCategory.COMPONENT_USAGE]: {
    label: 'Component Usage',
    description: 'React/Vue component usage',
    icon: 'symbol-class',
    priority: 7
  },
  [UsageCategory.TYPE_DEFINITION]: {
    label: 'Type Definitions',
    description: 'Type aliases and definitions',
    icon: 'symbol-interface',
    priority: 8
  },
  [UsageCategory.INTERFACE_DEFINITION]: {
    label: 'Interface Definitions',
    description: 'Interface declarations',
    icon: 'symbol-interface',
    priority: 9
  },
  [UsageCategory.CLASS_DEFINITION]: {
    label: 'Class Definitions',
    description: 'Class declarations',
    icon: 'symbol-class',
    priority: 10
  },
  [UsageCategory.PROPERTY_ACCESS]: {
    label: 'Property Access',
    description: 'Object property access',
    icon: 'symbol-property',
    priority: 11
  },
  [UsageCategory.COMMENT]: {
    label: 'Comments',
    description: 'Matches in comments',
    icon: 'comment',
    priority: 12
  },
  [UsageCategory.STRING_LITERAL]: {
    label: 'String Literals',
    description: 'Matches in string literals',
    icon: 'quote',
    priority: 13
  },
  [UsageCategory.OTHER]: {
    label: 'Other',
    description: 'Other matches',
    icon: 'circle-filled',
    priority: 14
  }
};