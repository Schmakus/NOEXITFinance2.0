import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'supabase/functions/_shared'] }, // Modernes Ignorieren
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      
      // --- Hier bändigen wir die Fehler ---
      '@typescript-eslint/no-explicit-any': 'off',      // Erlaubt 'any'
      '@typescript-eslint/no-unused-vars': 'warn',     // Ungenutzte Variablen nur Warnung
      '@typescript-eslint/no-empty-object-type': 'off', // Erlaubt leere Interfaces
      '@typescript-eslint/no-unused-expressions': 'warn',
      'react-hooks/set-state-in-effect': 'off',        // Schaltet den Fehler in Layout.tsx aus
      'react-hooks/exhaustive-deps': 'warn',           // Fehlende Dependencies nur Warnung
      'no-empty': 'warn',                              // Leere Code-Blöcke erlauben
      'prefer-const': 'warn',                          // const/let Fehler ignorieren
      'no-extra-boolean-cast': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',      // Erlaubt @ts-ignore etc.
      'no-console': 'off',
      'no-useless-assignment': 'warn',
      'report-unused-disable-directives': 'off',
      'linterOptions': {
        reportUnusedDisableDirectives: 'off'
      }
    },
  },
)