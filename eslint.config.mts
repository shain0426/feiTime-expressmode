import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  // 忽略檔案
  {
    ignores: ["dist/**/*", "node_modules/**/*", "*.config.*"],
  },

  // JavaScript 檔案
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...js.configs.recommended,
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
  },

  // TypeScript 檔案
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,mts,cts}"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
