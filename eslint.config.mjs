import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs", 
      globals: {
        ...globals.node,
        ...globals.jest, 
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off", 
      "no-undef": "error"
    },
    ignores: [
      "eslint.config.mjs", // <-- Add this line to stop it from scanning itself
      "node_modules/**",
      "k8s/**",
      "*.json",
      "*.yml",
      "*.yaml"
    ]
  },
];