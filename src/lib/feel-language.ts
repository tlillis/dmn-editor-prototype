import { StreamLanguage } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// FEEL keywords
const keywords = [
  'if',
  'then',
  'else',
  'for',
  'return',
  'in',
  'and',
  'or',
  'not',
  'between',
  'instance',
  'of',
  'some',
  'every',
  'satisfies',
  'function',
  'external',
  'context',
  'list',
  'range',
]

// FEEL built-in functions
const builtinFunctions = [
  // Number functions
  'abs',
  'ceiling',
  'floor',
  'round',
  'decimal',
  'modulo',
  'sqrt',
  'log',
  'exp',
  'odd',
  'even',
  // String functions
  'substring',
  'string length',
  'upper case',
  'lower case',
  'substring before',
  'substring after',
  'replace',
  'contains',
  'starts with',
  'ends with',
  'matches',
  'split',
  'string join',
  // List functions
  'list contains',
  'count',
  'min',
  'max',
  'sum',
  'mean',
  'product',
  'median',
  'stddev',
  'mode',
  'all',
  'any',
  'sublist',
  'append',
  'concatenate',
  'insert before',
  'remove',
  'reverse',
  'index of',
  'union',
  'distinct values',
  'duplicate values',
  'flatten',
  'sort',
  // Boolean functions
  'not',
  // Date/time functions
  'date',
  'time',
  'date and time',
  'duration',
  'years and months duration',
  'now',
  'today',
  'day of week',
  'day of year',
  'week of year',
  'month of year',
  // Range functions
  'before',
  'after',
  'meets',
  'met by',
  'overlaps',
  'overlaps before',
  'overlaps after',
  'finishes',
  'finished by',
  'includes',
  'during',
  'starts',
  'started by',
  'coincides',
  // Context functions
  'get value',
  'get entries',
  // Type functions
  'is defined',
  'number',
  'string',
]

// Simple function names (single word) for quick lookup
const simpleFunctions = new Set(
  builtinFunctions.filter((f) => !f.includes(' '))
)

const keywordSet = new Set(keywords)

// FEEL language mode for CodeMirror
export const feelLanguage = StreamLanguage.define({
  name: 'feel',

  token(stream) {
    // Skip whitespace
    if (stream.eatSpace()) return null

    // Comments (some FEEL implementations support //)
    if (stream.match('//')) {
      stream.skipToEnd()
      return 'comment'
    }

    // Strings
    if (stream.match('"')) {
      while (!stream.eol()) {
        const ch = stream.next()
        if (ch === '"') break
        if (ch === '\\') stream.next() // escape
      }
      return 'string'
    }

    // Numbers
    if (stream.match(/^-?\d+(\.\d+)?/)) {
      return 'number'
    }

    // Operators
    if (
      stream.match('<=') ||
      stream.match('>=') ||
      stream.match('!=') ||
      stream.match('**') ||
      stream.match('..') ||
      stream.match(/^[+\-*\/=<>]/)
    ) {
      return 'operator'
    }

    // Brackets and punctuation
    if (stream.match(/^[()[\]{},.:]/)) {
      return 'punctuation'
    }

    // Identifiers, keywords, and functions
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      const word = stream.current()

      // Check for boolean literals
      if (word === 'true' || word === 'false' || word === 'null') {
        return 'bool'
      }

      // Check for keywords
      if (keywordSet.has(word)) {
        return 'keyword'
      }

      // Check for built-in functions (single word)
      if (simpleFunctions.has(word)) {
        return 'function'
      }

      // Default to variable name
      return 'variableName'
    }

    // Names with spaces (e.g., "Gross Monthly Income")
    // These are typically referenced directly without quotes in FEEL
    // We'll treat capitalized words as potential variable names
    if (stream.match(/^[A-Z][a-zA-Z0-9]*( [A-Z][a-zA-Z0-9]*)*/)) {
      return 'variableName'
    }

    // Consume any other character
    stream.next()
    return null
  },

  tokenTable: {
    comment: t.comment,
    string: t.string,
    number: t.number,
    bool: t.bool,
    keyword: t.keyword,
    operator: t.operator,
    punctuation: t.punctuation,
    function: t.function(t.variableName),
    variableName: t.variableName,
  },
})
