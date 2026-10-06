import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "version-offline-shell",
      apply: "build",
      closeBundle() {
        const hash = createHash("sha256")
          .update(readFileSync("dist/index.html"))
          .digest("hex")
          .slice(0, 12);
        const worker = readFileSync("dist/sw.js", "utf8").replace(
          /fitness-shell-[a-zA-Z0-9-]+/,
          `fitness-shell-${hash}`,
        );
        writeFileSync("dist/sw.js", worker);
      },
    },
  ],
  base: "./",
  test: { include: ["src/**/*.test.ts"] },
});
