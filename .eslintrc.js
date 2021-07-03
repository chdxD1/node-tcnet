module.exports = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 2017,
        sourceType: "module",
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    root: true, 
    rules: {
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars-experimental": "warn",

        // We simply have empty functions at some places, so we ignore this rule.
        "@typescript-eslint/no-empty-function": ["warn", { allow: ["arrowFunctions"] }],

        "no-console": ["warn"],
    },
};
