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
            'no-unused-vars': ['error', { 'varsIgnorePattern': 'React|screen|ImportMeta' }],
            // tabIndex=-1 on role=dialog is valid for focus-trapping modals (WAI-ARIA spec)
            'jsx-a11y/no-noninteractive-element-interactions': 'warn',
        },
    },
];
