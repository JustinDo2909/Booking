
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  {
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  globalIgnores([
    "**/*",
  ]),
]);
