module.exports = {
  extends: 'eslint:recommended',
  env: {
    node: true,
    es6: true
  },
  "parserOptions": {
    "ecmaVersion": 10
  },
  rules: {
    'no-console': 0,
    'no-unused-vars': [2,{args:'none'}]
  }
}
