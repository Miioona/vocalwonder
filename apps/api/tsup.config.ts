import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node24",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Workspace packages ship TypeScript source, so they have to be bundled in.
  // Left external, the build would emit an import that Node cannot run.
  noExternal: [/^@vocalwonder\//],
});
