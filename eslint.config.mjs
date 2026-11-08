import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  globalIgnores([".next/**", "dist/**", "release/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
  js.configs.recommended,
  { files: ["**/*.{ts,tsx}"], extends: tseslint.configs.recommended,
    languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ["**/*.cjs"], languageOptions: { sourceType: "commonjs", globals: globals.node } },
  { files: ["**/*.mjs"], languageOptions: { globals: globals.node } },
  { files: ["src/**/*.{ts,tsx}"], extends: [reactHooks.configs.flat.recommended, jsxA11y.flatConfigs.recommended] },
]);

export default eslintConfig;
