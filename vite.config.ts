import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*.{js,ts,tsx,md}": "vp check --fix",
  },
  lint: {
    ignorePatterns: ["dist", "build", "node_modules"],
    plugins: ["typescript", "react", "import"],
    rules: {},
  },
  fmt: {
    semi: true,
    singleQuote: false,
    ignorePatterns: [".turbo", "node_modules", "dist", "build", "bun.lock*"],
  },
});
