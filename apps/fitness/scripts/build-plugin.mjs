import { build } from "vite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

mkdirSync("supabase/functions/fitness-coach/generated", { recursive: true });
for (const name of ["model", "catalog", "importWorkout", "importRoutine", "plugin"]) {
  const source = readFileSync(`src/domain/${name}.ts`, "utf8")
    .replace(/from "(\.\/[^".]+)"/g, 'from "$1.ts"');
  writeFileSync(`supabase/functions/fitness-coach/generated/${name}.ts`, `// Generated from src/domain/${name}.ts by scripts/build-plugin.mjs.\n${source}`);
}
if (!process.argv.includes("--domain-only")) {
  await build({ configFile: resolve("vite.plugin.config.ts") });
  let html = readFileSync("dist-plugin/plugin.html", "utf8");
  html = html.replace(/<script\b[^>]*src="([^\"]+)"[^>]*><\/script>/g, (_tag, path) => {
    const js = readFileSync(resolve("dist-plugin", path.replace(/^\.\//, "")), "utf8");
    return `<script type="module">${js.replace(/<\/script/gi, "<\\/script")}</script>`;
  });
  html = html.replace(/<link\b[^>]*href="([^\"]+\.css)"[^>]*>/g, (_tag, path) => `<style>${readFileSync(resolve("dist-plugin", path.replace(/^\.\//, "")), "utf8")}</style>`);
  mkdirSync("dist", { recursive: true });
  writeFileSync("dist/plugin-ui.html", html);
}
