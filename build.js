// build.js

/**
 * you could use
 *
 * ```sh
 * yarn pkg ./go --out-path ./dist && cp -r ./node_modules/puppeteer/.local-chromium ./dist/puppeteer
 * ```
 *
 * but this is cross-platform (hopefully?)
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

	console.log(`remove '${oldDirPath}'`);
	await fs.remove(outDirPath);

	console.log(`ensure '${oldDirPath}' exists`);
	await fs.ensureDir(outDirPath);

	console.log(`copy '${exampleConfigFilePath}' to '${configFileOutPath}'`);
	await fs.copyFile(exampleConfigFilePath, configFileOutPath);

	console.log(`build the binary using 'zeit/pkg' 'exec' module`);
	await execPkgAsync([
		path.join(process.cwd(), "go"),
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
