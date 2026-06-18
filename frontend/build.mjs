// Bundle the TypeScript frontend to ../public/app.js (browser IIFE, no module loader).
import * as esbuild from "esbuild";

const opts = {
  entryPoints: ["src/app.ts"],
  bundle: true,
  format: "iife",
  target: ["es2019"],
  outfile: "../public/app.js",
  charset: "utf8",
  legalComments: "none",
  banner: { js: "/* Generated from frontend/src by esbuild — edit the .ts sources, not this file. */" },
};

if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  console.log("watching frontend/src …");
} else {
  await esbuild.build(opts);
  console.log("built ../public/app.js");
}
