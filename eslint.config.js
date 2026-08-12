import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...(reactHooks.configs.recommended.rules ?? {}),
      // The react-hooks v7 recommended set adds React-Compiler-era strictness
      // that flags long-standing, correct patterns in this codebase:
      // - purity: flags impure calls (Date.now/Math.random) inside event
      //   handlers, not just render; the app uses them for id generation.
      // - set-state-in-effect: flags the legitimate "sync from external store"
      //   effects (recoveryMode, url tab params).
      // - no-useless-assignment (core): flags the idiomatic let-then-reassign
      //   navSections pattern in DashboardLayout.
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      // Chat.tsx defines a layout-only closure component inside render; it holds
      // no state, so the strict React-Compiler rule is not actionable here.
      'react-hooks/static-components': 'off',
      'no-useless-assignment': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-this-alias': 'off',
    },
  },
);
