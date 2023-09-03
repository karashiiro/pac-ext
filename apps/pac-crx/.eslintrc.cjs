const { resolve } = require('node:path');

const project = resolve(__dirname, 'tsconfig.node.json');

module.exports = {
  extends: ['goatcorp-pac/typescript'],
  ignorePatterns: ['.eslintrc.cjs'],
  parserOptions: {
    project,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project,
      },
    },
  },
};
