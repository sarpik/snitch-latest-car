import babel from "rollup-plugin-babel";
import { preserveShebangs } from "rollup-plugin-preserve-shebangs";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import builtins from "rollup-plugin-node-builtins";

export default {
	// entry: "go.js",
	// dest: "bundle.js",
	// format: "esm" /** amd, cjs, esm, iife, umd */,
	input: "go.js",
	output: {
		file: "bundle.js",
		format: "iife",
		name: "snitchLatestCar"
	},
	plugins: [
		// babel({
		// 	// "runtimeHelpers": true,
		// 	babelrc: false,
		// 	presets: [['@babel/preset-env', { modules: false }]],
		// }),
		preserveShebangs() /** https://github.com/rollup/rollup/issues/235 */,
		resolve() /** https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency */,
		commonjs() /** https://rollupjs.org/guide/en/#error-name-is-not-exported-by-module */,
		// builtins() /** https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency */,
		json(),
	],
	external: builtins
};
