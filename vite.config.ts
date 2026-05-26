import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    dts: true,
    format: ["esm"],
    clean: true,
  },
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    ignorePatterns: ["dist", "build", "node_modules"],
    plugins: ["typescript", "react", "import"],
    rules: {
      // Disabled: mock callbacks often need empty functions
      "no-empty-function": "off",
      // Disabled: mock factories use Promise.resolve/reject (conflicts with require-await)
      "promise/prefer-await-to-then": "off",
    },
  },
  fmt: {
    arrowParens: "always",
    bracketSameLine: false,
    bracketSpacing: true,
    endOfLine: "lf",
    jsxSingleQuote: false,
    printWidth: 80,
    quoteProps: "as-needed",
    semi: true,
    singleQuote: false,
    sortImports: {
      ignoreCase: true,
      newlinesBetween: true,
      order: "asc",
    },
    sortPackageJson: true,
    tabWidth: 2,
    trailingComma: "es5",
    useTabs: false,
    ignorePatterns: ["dist", "build", "node_modules", "bun.lock*"],
  },
});
