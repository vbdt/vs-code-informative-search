"use strict";
/**
 * Type definitions for the Informative Search extension
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_INFO = exports.DEFAULT_SEARCH_CONFIG = exports.UsageCategory = void 0;
/**
 * Categories for different types of code usage
 */
var UsageCategory;
(function (UsageCategory) {
    UsageCategory["IMPORT"] = "import";
    UsageCategory["EXPORT"] = "export";
    UsageCategory["FUNCTION_DEFINITION"] = "function-definition";
    UsageCategory["FUNCTION_CALL"] = "function-call";
    UsageCategory["VARIABLE_DECLARATION"] = "variable-declaration";
    UsageCategory["VARIABLE_USAGE"] = "variable-usage";
    UsageCategory["COMPONENT_USAGE"] = "component-usage";
    UsageCategory["TYPE_DEFINITION"] = "type-definition";
    UsageCategory["INTERFACE_DEFINITION"] = "interface-definition";
    UsageCategory["CLASS_DEFINITION"] = "class-definition";
    UsageCategory["PROPERTY_ACCESS"] = "property-access";
    UsageCategory["COMMENT"] = "comment";
    UsageCategory["STRING_LITERAL"] = "string-literal";
    UsageCategory["OTHER"] = "other";
})(UsageCategory || (exports.UsageCategory = UsageCategory = {}));
/**
 * Default search configuration
 */
exports.DEFAULT_SEARCH_CONFIG = {
    includePatterns: ['**/*.{js,ts,jsx,tsx,vue,py,java,c,cpp,cs,php,rb,go,rs}'],
    excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.min.js'],
    includeComments: true,
    includeStringLiterals: false,
    caseSensitive: false,
    useRegex: false,
    maxResultsPerCategory: 100
};
/**
 * Category display configuration
 */
exports.CATEGORY_INFO = {
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
//# sourceMappingURL=searchTypes.js.map