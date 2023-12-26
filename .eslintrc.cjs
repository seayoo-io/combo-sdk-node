// eslint-disable-next-line @typescript-eslint/no-var-requires
const prettierrc = require("./.prettierrc.json")
module.exports = {
  root: true,
  env: {
    node: true,
    commonjs: true,
    es2022: true,
  },
  parser: "@typescript-eslint/parser",
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:prettier/recommended", "prettier"],
  plugins: ["prettier", "@typescript-eslint"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      modules: true,
    },
  },
  rules: {
    "no-console": "off",
    "no-debugger": "off",
    eqeqeq: ["error", "always"],
    "no-case-declarations": "off",
    "prettier/prettier": ["error", prettierrc],
  },
}
