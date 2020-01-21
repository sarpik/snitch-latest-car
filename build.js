// build.js

/**
 * This is supposed to be used as an API
 * for building the application itself.
 *
 * Copyright © Kipras Melnikovas (https://kipras.org) <kipras@kipras.org>
 *
 * IMPORTANT
 * `./installer.js` depends on this, but indirectly (even more important).
 *
 * TL;DR:
 * DO NOT INTRODUCE BREAKING CHANGES TO THIS FILE
 * if you want to remain backwards-compatible
 * with previously compiled `installer` binaries.
 *
 * Breaking changes would include, but are not limited to:
 * * Renaming the file
 * * Changing it's core behaviour (building the application)
 * * Not using `export default` for the main `build` function
 *
 * Explanation:
 *
 * Previously compiled binary executables will download the latest sources
 * from a remote repository and will point to `<downloaded-repository-path>/build.js`
 *
 * The `installer.js` (and thus the compiled `installer` binaries) do *not* use
 *
 * ```js
 * const build = require("./build.js");
 * ```
 *
 * instead, they use
 *
 * ```js
 * const build = require(path.join(process.cwd(), "build.js"));
 * ```
 *
 * because `installer.js` is meant to be *compiled to* and *used as* a binary executable!
 *
 * This allows the binary to download the latest source files
 * from the remote repository and **use** the downloaded `build.js` script!
 *
 * Otherwise it'd be pointless to download the latest sources,
 * since the `build.js` script might be outdated,
 * making the binary useless until it's recompiled
 * against the latest `build.js` script --
 * and that's what we are avoiding this way.
 *
 */

const fs = require("fs-extra");
const path = require("path");
const { exec: execPkgAsync } = require("pkg");

const build = async () => {
	console.log("begin build");

	const outDirPath = "dist";

	const exampleConfigFilePath = "config.example.js";
	const configFileOutPath = path.join(outDirPath, "config.js");

	const chromiumDirPath = path.join("node_modules", "puppeteer", ".local-chromium");
	const chromiumOutDirPath = path.join(outDirPath, "puppeteer");

	console.log(`remove '${outDirPath}'`);
	await fs.remove(outDirPath);

	console.log(`ensure '${outDirPath}' exists`);
	await fs.ensureDir(outDirPath);

	console.log(`copy '${exampleConfigFilePath}' to '${configFileOutPath}'`);
	await fs.copyFile(exampleConfigFilePath, configFileOutPath);

	console.log(`build the binary using 'zeit/pkg' 'exec' module`);
	await execPkgAsync([
		path.join(process.cwd(), "go"), //
		"--out-path",
		outDirPath,
		"--config",
		"package.json",
	]);

	console.log(`copy '${chromiumDirPath}' to '${chromiumOutDirPath}'`);
	await fs.copy(chromiumDirPath, chromiumOutDirPath);

	console.log("end build");
};

module.exports = build;
