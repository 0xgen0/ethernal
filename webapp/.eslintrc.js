module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 9,
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
      jsx: true,
      spread: true,
    },
    sourceType: 'module',
  },
  plugins: ['disable', 'react', 'svelte3', 'prettier'],
  processor: 'disable/disable',
  rules: {
    'prettier/prettier': 'error',
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
    'react/prop-types': 0,
    'no-underscore-dangle': 0,
    'no-bitwise': 0,
    camelcase: 1,
    'no-script-url': 1,
    'no-param-reassign': 0,
  },
  extends: ['plugin:react/recommended', 'airbnb-base', 'prettier'],
  overrides: [
    {
      files: ['**/*.svelte'],
      processor: 'svelte3/svelte3',
      settings: {
        'disable/plugins': ['prettier'],
        'svelte3/ignore-styles': ({ lang }) => lang === 'scss',
      },
      rules: {
        'svelte3/lint-template': 2,
        'prettier/prettier': 'off',
        // Known issues
        'import/first': 'off',
        'import/no-mutable-exports': 'off',
        'import/no-unresolved': 'off',
        'import/prefer-default-export': 'off',
        'prefer-const': 1,
      },
    },
  ],
  settings: {
    'import/resolver': {
      node: {
        paths: ['src'],
        extensions: ['.js', '.jsx'],
      },
    },
  },
  globals: {
    BUILD_TIMESTAMP: true,
    CACHE_API: true,
    COMMIT: true,
    ENV: true,
    ETH_URL: true,
    MODE: true,
    SENTRY_DSN: true
  },
};
