import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

// Minimal flat config: catches real bugs without flooding the codebase
// with style rules it was never linted against. TS handles types/undef;
// no-explicit-any is intentionally allowed (legacy codebase).
export default [
  { ignores: [".next/**", "node_modules/**", "out/**", "public/**", "next-env.d.ts", "supabase/functions/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
