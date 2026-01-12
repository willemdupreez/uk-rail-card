import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";
import fs from "node:fs";

const packageJson = JSON.parse(
  fs.readFileSync(new URL("./package.json", import.meta.url), "utf-8")
);

export default {
  input: "src/uk-rail-card.ts",
  output: {
    file: "dist/uk-rail-card.js",
    format: "es",
    sourcemap: true,
  },
  plugins: [
    typescript({ tsconfig: "./tsconfig.json" }),
    resolve(),
    replace({
      preventAssignment: true,
      values: {
        // __VERSION__: JSON.stringify(packageJson.version),
        __VERSION__: "1.1.1",
      },
    }),
  ],
};
