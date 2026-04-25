import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tsParser from '@typescript-eslint/parser';

export default [
    { ignores: ['dist'] },
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.browser,
                describe: true,
                it: true,
                expect: true,
                process: true,
            },
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        settings: { react: { version: '18.3' } },
        plugins: {
            react,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            'jsx-a11y': jsxA11y,
        },
        rules: {
            ...jsxA11y.configs.recommended.rules,
            ...js.configs.recommended.rules,
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
            ...reactHooks.configs.recommended.rules,
            'react/jsx-no-target-blank': 'off',
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
            'react/prop-types': 'off', // Lots of custom components missing prop types in this prototype
            // Apostrophes/quotes in JSX copy; escaping hurts readability in this codebase
            'react/no-unescaped-entities': 'off',
            // Many admin/dashboard surfaces use styled divs as overlays; tighten incrementally later
            'jsx-a11y/click-events-have-key-events': 'off',
            'jsx-a11y/no-static-element-interactions': 'off',
            'jsx-a11y/mouse-events-have-key-events': 'off',
            'jsx-a11y/no-noninteractive-element-interactions': 'off',
            'jsx-a11y/label-has-associated-control': 'off',
            'jsx-a11y/img-redundant-alt': 'off',
            'react-hooks/exhaustive-deps': 'off',
            // Too strict for common fetch/reset and modal-open patterns in this app
            'react-hooks/set-state-in-effect': 'off',
            'no-unused-vars': [
                'warn',
                {
                    varsIgnorePattern: '^(React|screen|ImportMeta)$|^_',
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            'jsx-a11y/interactive-supports-focus': 'off',
            'jsx-a11y/no-autofocus': 'off',
            'no-undef': 'off',
        },
    },
];
