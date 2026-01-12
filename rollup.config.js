import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/uk-rail-card.ts",
  output: {
    file: "dist/uk-rail-card.js",
    format: "es",
    sourcemap: true,
  },
  plugins: [resolve(), typescript({ tsconfig: "./tsconfig.json" })],
};
