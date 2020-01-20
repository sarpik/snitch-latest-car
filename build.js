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
	const outDirPath = "dist";

	const exampleConfigFilePath = "config.example.js";
	const configFileOutPath = path.join(outDirPath, "config.js");

	const chromiumDirPath = path.join("node_modules", "puppeteer", ".local-chromium");
	const chromiumOutDirPath = path.join(outDirPath, "puppeteer");

	await fs.remove(outDirPath);

	await fs.ensureDir(outDirPath);

	await fs.copyFile(exampleConfigFilePath, configFileOutPath);

	await execPkgAsync([
		path.join(process.cwd(), "go"),
		// "./go", //
		"--out-path",
		outDirPath,
		"--config",
		"package.json",
	]);

	await fs.copy(chromiumDirPath, chromiumOutDirPath, { recursive: true });
};

module.exports = build;
