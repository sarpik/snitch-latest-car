#!/usr/bin/env node
// installer.js
/**
 * Copyright © Kipras Melnikovas (https://kipras.org) <kipras@kipras.org>
 *
 * This file is meant to be compiled into a single executable with either
 * * zeit/pkg (currently broken), or
 * * nexe/nexe (WORKS!!!)
 * * any other compiler of choise that works (create a PR if it's better, thanks!)
 *
 * see `package.json` script `build:installer`
 *
 * ---
 *
 * Aight, packaging binaries from javascript is still a shitstorm,
 * even in 2020...
 * Basically, if you want to use `yarn` programmatically,
 * you should use `npm`.
 * rofl
 *
 *
 * `node-gyp` because of errors (TODO create issue @ zeit/pkg)
 *
 * TODO clean up /tmp directory once done
 * TODO find out if we need dependencies required here
 * as regular ones and not `devDependencies`
 * (such as `fs-extra` & `node-fetch`)
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-var-requires */

const os = require("os");
const process = require("process");
const path = require("path");
const util = require("util");

const npm = require("npm");
const fs = require("fs-extra");
const fetch = require("node-fetch");
const tar = require("tar");
/**
 * we depend on the `yarn` package
 * to be able to execute it's scripts through `child_process.exec`,
 * and this is how I'm marking it as important.
 */
// eslint-disable-next-line no-unused-vars
// const yarn = require("yarn");
// const { Project, scriptUtils } = require("@yarnpkg/core");
// const yarnCli = require("./node_modules/yarn/lib/cli.js");

// console.log("yarnCli", yarnCli);
// console.log("main", yarnCli.main());
// console.log("default", yarnCli.default());

const execAsync = util.promisify(require("child_process").exec);
const streamPipeline = util.promisify(require("stream").pipeline);

const repoName = "snitch-latest-car";
const repoUrl = `https://github.com/sarpik/${repoName}`;
const repoBranch = "master";
const getRepoPath = (tempDir) => path.join(tempDir, `${repoName}-${repoBranch.replace("/", "-")}`);

/**
 * Turns out there's a `.tar.gz` also available for the master branch!
 * This makes everything sooooo much simplier oh boy!
 *
 * It is not visible via the download button,
 * but since I've gone through many git tags,
 * I always noticed the `Source code` & the `Source code (tar.gz)`,
 * which is how I found that the master (& probably all other) branches
 * have the `.tar.gz` available for downloading, too!
 *
 * #githubPlsFix
 *
 */
// const repoZippedArchiveUrl = `${repoUrl}/archive/${repoBranch}.zip`;
const repoGzippedArchiveUrl = `${repoUrl}/archive/${repoBranch}.tar.gz`;

/**
 *
 */
const installer = async () => {
	const originalDir = process.cwd(); /** will cd back to this once done */
	let tempDir;

	try {
		const tempDirPrefix = path.join(os.tmpdir(), repoName);
		tempDir = await fs.mkdtemp(tempDirPrefix);

		console.log(tempDir);

		console.log("cd'ing to tempDir");
		process.chdir(tempDir);

		const repoPath = getRepoPath(tempDir);
		await fs.ensureDir(repoPath);

		if (!process.env.MOCK) {
			console.log("downloading .tar.gz of the master branch");
			const zippedArchivePath = path.join(tempDir, "archive");
			await download(repoGzippedArchiveUrl, zippedArchivePath);

			console.log("extracting via tar.x");
			await tar.x({ file: zippedArchivePath });

			console.log("cd'ing into extracted repo");
			process.chdir(repoPath);
		} else {
			console.log("BEGIN MOCK");
			const copySrcPath = path.join(__dirname, "**");

			console.log(`copying '${copySrcPath}' '${repoPath}'`);

			await execAsync(`cp -r ${copySrcPath} ${repoPath}`);
			process.chdir(repoPath);
			await execAsync("rm -rf node_modules");
			console.log("END MOCK");
		}

		// console.log("installing");
		// // await execAsync("yarn install");
		// // await execAsync(path.join(__dirname, "node_modules/.bin/yarn") + " install");
		// // yarnCli.install();

		// // // Project.prototype.install();

		// console.log("building");
		// // await execAsync("yarn build");
		// // await execAsync(path.join(__dirname, "node_modules/.bin/yarn") + " run build");
		// // yarnCli.runScript("build");

		// // // scriptUtils.prepareExternalProject();

		// console.log("moving into package");
		const builtPackagePath = path.join(repoPath, "dist");
		const builtPackageOutputPath = path.join(originalDir, "package");
		// await fs.move(builtPackagePath, builtPackageOutputPath, { overwrite: true });

		// const npmConfig = await fs.readJson("./package.json");
		// console.log("npmConfig", npmConfig);

		// npm.load(npmConfig, (err) => {
		console.log("loading npm");
		npm.load((err, _result) => {
			if (err) {
				throw err;
			}

			console.log("installing");
			npm.commands.install([], (err, data) => {
				if (err) {
					throw err;
				}

				console.log("data", data);

				console.log("building");
				npm.commands["run-script"](["build"], (err, data1) => {
					if (err) {
						throw err;
					}

					console.log("data1", data1);

					console.log("moving into package");
					fs.moveSync(builtPackagePath, builtPackageOutputPath, { overwrite: true });

					/** BEGIN copy-paste from `finally` */
					console.log("cd'ing back to the originalDir");
					process.chdir(originalDir);

					console.log("removing tempDir");
					fs.removeSync(tempDir);

					// console.log("removing package-lock.json");
					// fs.removeSync("package-lock.json");
					/** END copy-paste from `finally` */
				});
			});
		});
	} catch (e) {
		console.log("handling exeption");
		throw e;
	} finally {
		/**
		 * stuff is removed from here & moved into the callbacks
		 * because it'd skip the npm.load etc.
		 *
		 * TODO FIXME
		 *
		 */
		// console.log("cd'ing back to the originalDir");
		// process.chdir(originalDir);
		// // console.log("removing tempDir");
		// // await fs.remove(tempDir);
		// // console.log("removing package-lock.json");
		// // await fs.remove("package-lock.json");
	}
};

installer();

/**
 * https://github.com/node-fetch/node-fetch/issues/375#issuecomment-495953540
 *
 * @param {string} url
 * @param {string} dest
 *
 * @returns {Promise<void>}
 */
async function download(url, dest) {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`unexpected response ${response.statusText}`);
	}

	await streamPipeline(response.body, fs.createWriteStream(dest));
}
