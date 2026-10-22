import { rm } from "node:fs/promises";
import { build } from "esbuild";

// Bundles the API into a single ESM file runnable by plain Node.js.
// Workspace packages (@flow-studio/*) expose TypeScript source, so they are
// bundled; npm packages stay external and load from node_modules at runtime.
const workspacePackagePrefix = "@flow-studio/";

await rm("dist", { recursive: true, force: true });

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  logLevel: "info",
  plugins: [
    {
      name: "externalize-npm-packages",
      setup(pluginBuild) {
        pluginBuild.onResolve({ filter: /^[^./]/ }, (args) =>
          args.path.startsWith(workspacePackagePrefix)
            ? undefined
            : { path: args.path, external: true },
        );
      },
    },
  ],
});
