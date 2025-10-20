module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', "Icons.js"],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    "react/prop-types": 0,
    "semi": ["error", "always", { "omitLastInOneLineClassBody": true }],
    "react-refresh/only-export-components": [
      'warn',
      { allowConstantExport: true },
    ],
    "react-hooks/exhaustive-deps": 0,
    "no-console": [
      "error"
    ],
    "quotes": [
      "error",
      "double"
    ]
  },
}
