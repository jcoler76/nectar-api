module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  plugins: ['import'],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'import/no-relative-parent-imports': 'off',
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
            position: 'before'
          }
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc'
        }
      }
    ]
  },
  settings: {
    'import/resolver': {
      node: {
        paths: ['src'],
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      extends: [
        'react-app',
        'react-app/jest'
      ],
      rules: {
        'no-undef': 'off' // TypeScript handles this
      }
    }
  ]
};