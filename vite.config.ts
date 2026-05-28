import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    cache: true,
  },
  staged: {
    "*": "vp check --fix",
  },
});
