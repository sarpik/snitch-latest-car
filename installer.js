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
// const process = require("process");
const path = require("path");
const util = require("util");

const npm = require("npm");
const fs = require("fs-extra");
const fetch = require("node-fetch");
const tar = require("tar");
const downloadChromium = require("download-chromium");
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
const repoBranch = "master"; /** NOTE you can change this to test our your branch */
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
	/**
	 * if you want to use the DEV environment - set `DEV` to a non-empty value
	 * otherwise this defaults to `true`,
	 * and it's important because that's what the end user gets by default!
	 */
	const shouldUseProduction = !process.env.DEV;

	console.log(`\
installer

shouldUseProduction:   ${shouldUseProduction}
repoUrl:               ${repoUrl}
repoGzippedArchiveUrl: ${repoGzippedArchiveUrl}
`);

	const originalDir = process.cwd(); /** will cd back to this once done */
	let tempDir;

	try {
		const tempDirPrefix = path.join(os.tmpdir(), repoName);
		tempDir = await fs.mkdtemp(tempDirPrefix);

		console.log(tempDir);
		console.log();

		console.log("cd'ing to tempDir");
		process.chdir(tempDir);

		const repoPath = getRepoPath(tempDir);
		await fs.ensureDir(repoPath);

		/**
		 *
		 * @NOTE if during development, you want to see the changes that
		 * take effect based on current files
		 *
		 * When you're publishing the binaries however, you must commit your changes
		 * & then afterwards build-installer with `PROD` set to non-empty value -
		 * it will then download the appropriate files once a user uses it.
		 *
		 * TODO make this a CI step & update the downloadURL based on commit/tag
		 * for backwards-compatibility
		 *
		 * TODO this is not enforced at compile time -.-
		 *
		 */
		if (shouldUseProduction) {
			/**
			 * make sure everything here is cross-platform
			 */
			console.log("downloading .tar.gz of the master branch");
			const zippedArchivePath = path.join(tempDir, "archive");
			await download(repoGzippedArchiveUrl, zippedArchivePath);

			console.log("extracting via tar.x");
			await tar.x({ file: zippedArchivePath });

			console.log("cd'ing into extracted repo");
			process.chdir(repoPath);
		} else {
			/**
			 * this will not be shipped to end users,
			 * just other developers,
			 * so a hack or two might be appropriate,
			 * but take some time later on to clean up the technical debt!
			 */
			const copySrcPath = path.join(__dirname, "**");

			console.log(`copying '${copySrcPath}' '${repoPath}'`);

			await execAsync(`cp -r ${copySrcPath} ${repoPath}`);
			process.chdir(repoPath);

			await execAsync("rm -rf node_modules package bundle dist installer");

			/**
			 * TODO clean up stuff here like `package` and `bundle` after copying
			 */
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

			npm.config.set("scripts-prepend-node-path", true);
			npm.config.set("ignore-scripts", true); /** otherwise puppeteer's `node install.js` script will fail us */

			/**
			 * we'll unset this & call `require("puppeteer/install.js");`
			 * below once the installation is done
			 */
			// process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "yesPlease... fml";

			console.log("installing");
			npm.commands.install([], async (err, data) => {
				if (err) {
					throw err;
				}

				console.log("data", data);

				console.log("launching puppeteer's install script");

				// process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "";
				// delete process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD;

				// const dynamicPuppeteerInstallScriptPath = path.join(
				// 	process.cwd(),
				// 	"node_modules",
				// 	"puppeteer",
				// 	"install.js"
				// );

				const dynamicPuppeteerPath = path.join(process.cwd(), "node_modules", "puppeteer");
				const revision = require(path.join(dynamicPuppeteerPath, "package.json")).puppeteer.chromium_revision;
				const chromiumInstallPath = path.join(dynamicPuppeteerPath, ".local-chromium");

				await downloadChromium({
					revision, //
					onProgress: undefined,
					installPath: chromiumInstallPath,
				});

				console.log("creating path to 'build.js'");
				const dynamicBuildScriptPath = path.join(process.cwd(), "build.js");

				console.log(`requiring '${dynamicBuildScriptPath}'`);
				const build = require(dynamicBuildScriptPath);

				console.log("building");
				await build();

				console.log("moving into package");
				fs.moveSync(builtPackagePath, builtPackageOutputPath, { overwrite: true });

				/** BEGIN copy-paste from `finally` */
				console.log("cd'ing back to the originalDir");
				process.chdir(originalDir);

				// console.log("removing tempDir");
				// fs.removeSync(tempDir);

				// console.log("removing package-lock.json");
				// fs.removeSync("package-lock.json");
				/** END copy-paste from `finally` */

				// // require(dynamicPuppeteerInstallScriptPath);
				// // console.log("done installing chromium");
				// downloadChromium({ revision, onProgress: () => {}, installPath: chromiumInstallPath }).then(() => {
				// 	/** unknown when the previous fn finishes - throw this into the waiting queue too */
				// 	console.log("building");
				// 	npm.commands["run-script"](["build"], (err, data1) => {
				// 		if (err) {
				// 			throw err;
				// 		}

				// 		console.log("data1", data1);

				// 		console.log("moving into package");
				// 		fs.moveSync(builtPackagePath, builtPackageOutputPath, { overwrite: true });

				// 		/** BEGIN copy-paste from `finally` */
				// 		console.log("cd'ing back to the originalDir");
				// 		process.chdir(originalDir);

				// 		console.log("removing tempDir");
				// 		fs.removeSync(tempDir);

				// 		// console.log("removing package-lock.json");
				// 		// fs.removeSync("package-lock.json");
				// 		/** END copy-paste from `finally` */
				// 	});
				// });
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

// // /**
// //  * ripped off straight from https://github.com/puppeteer/puppeteer/blob/master/install.js
// //  * since I couldn't find a way to detect when the download is finished
// //  * and since it's asynchronous with `.then` - there's no way to stop my code
// //  * until it finishes,
// //  * so the only solution is to put the code here & modify it slightly, ffs
// //  */
// // async function downloadChromium() {
// // 	const originalDir = process.cwd();

// // 	const dynamicPuppeteerPath = path.join(process.cwd(), "node_modules", "puppeteer");
// // 	// // process.chdir(dynamicPuppeteerPath);

// // 	try {
// // 		/**
// // 		 * Copyright 2017 Google Inc. All rights reserved.
// // 		 *
// // 		 * Licensed under the Apache License, Version 2.0 (the "License");
// // 		 * you may not use this file except in compliance with the License.
// // 		 * You may obtain a copy of the License at
// // 		 *
// // 		 *     http://www.apache.org/licenses/LICENSE-2.0
// // 		 *
// // 		 * Unless required by applicable law or agreed to in writing, software
// // 		 * distributed under the License is distributed on an "AS IS" BASIS,
// // 		 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// // 		 * See the License for the specific language governing permissions and
// // 		 * limitations under the License.
// // 		 */

// // 		// puppeteer-core should not install anything.
// // 		// // if (require("./package.json").name === "puppeteer-core") return;
// // 		if (require(path.join(dynamicPuppeteerPath, "package.json")).name === "puppeteer-core") return;

// // 		if (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD) {
// // 			logPolitely(
// // 				'**INFO** Skipping Chromium download. "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD" environment variable was found.'
// // 			);
// // 			return;
// // 		}
// // 		if (
// // 			process.env.NPM_CONFIG_PUPPETEER_SKIP_CHROMIUM_DOWNLOAD ||
// // 			process.env.npm_config_puppeteer_skip_chromium_download
// // 		) {
// // 			logPolitely(
// // 				'**INFO** Skipping Chromium download. "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD" was set in npm config.'
// // 			);
// // 			return;
// // 		}
// // 		if (
// // 			process.env.NPM_PACKAGE_CONFIG_PUPPETEER_SKIP_CHROMIUM_DOWNLOAD ||
// // 			process.env.npm_package_config_puppeteer_skip_chromium_download
// // 		) {
// // 			logPolitely(
// // 				'**INFO** Skipping Chromium download. "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD" was set in project config.'
// // 			);
// // 			return;
// // 		}

// // 		const downloadHost =
// // 			process.env.PUPPETEER_DOWNLOAD_HOST ||
// // 			process.env.npm_config_puppeteer_download_host ||
// // 			process.env.npm_package_config_puppeteer_download_host;

// // 		// // const puppeteer = require("./index");
// // 		const puppeteer = require(path.join(dynamicPuppeteerPath, "index"));
// // 		const browserFetcher = puppeteer.createBrowserFetcher({ host: downloadHost });

// // 		const revision =
// // 			process.env.PUPPETEER_CHROMIUM_REVISION ||
// // 			process.env.npm_config_puppeteer_chromium_revision ||
// // 			process.env.npm_package_config_puppeteer_chromium_revision ||
// // 			// // require("./package.json").puppeteer.chromium_revision;
// // 			require(path.join(dynamicPuppeteerPath, "package.json")).puppeteer.chromium_revision;

// // 		const revisionInfo = browserFetcher.revisionInfo(revision);

// // 		// Do nothing if the revision is already downloaded.
// // 		if (revisionInfo.local) {
// // 			generateProtocolTypesIfNecessary(false /* updated */);
// // 			return;
// // 		}

// // 		// Override current environment proxy settings with npm configuration, if any.
// // 		const NPM_HTTPS_PROXY = process.env.npm_config_https_proxy || process.env.npm_config_proxy;
// // 		const NPM_HTTP_PROXY = process.env.npm_config_http_proxy || process.env.npm_config_proxy;
// // 		const NPM_NO_PROXY = process.env.npm_config_no_proxy;

// // 		if (NPM_HTTPS_PROXY) process.env.HTTPS_PROXY = NPM_HTTPS_PROXY;
// // 		if (NPM_HTTP_PROXY) process.env.HTTP_PROXY = NPM_HTTP_PROXY;
// // 		if (NPM_NO_PROXY) process.env.NO_PROXY = NPM_NO_PROXY;

// // 		// // browserFetcher
// // 		// // 	.download(revisionInfo.revision, onProgress)
// // 		// // 	.then(() => browserFetcher.localRevisions())
// // 		// // 	.then(onSuccess)
// // 		// // 	.catch(onError);
// // 		await browserFetcher.download(revisionInfo.revision, onProgress);
// // 		const localRevisions = await browserFetcher.localRevisions();
// // 		onSuccess(localRevisions);

// // 		/**
// // 		 * @param {!Array<string>}
// // 		 * @return {!Promise}
// // 		 */
// // 		function onSuccess(localRevisions) {
// // 			logPolitely("Chromium downloaded to " + revisionInfo.folderPath);
// // 			localRevisions = localRevisions.filter((revision) => revision !== revisionInfo.revision);
// // 			// Remove previous chromium revisions.
// // 			const cleanupOldVersions = localRevisions.map((revision) => browserFetcher.remove(revision));
// // 			return Promise.all([...cleanupOldVersions, generateProtocolTypesIfNecessary(true /* updated */)]);
// // 		}

// // 		let progressBar = null;
// // 		let lastDownloadedBytes = 0;
// // 		function onProgress(downloadedBytes, totalBytes) {
// // 			if (!progressBar) {
// // 				const ProgressBar = require("progress");
// // 				progressBar = new ProgressBar(
// // 					`Downloading Chromium r${revision} - ${toMegabytes(totalBytes)} [:bar] :percent :etas `,
// // 					{
// // 						complete: "=",
// // 						incomplete: " ",
// // 						width: 20,
// // 						total: totalBytes,
// // 					}
// // 				);
// // 			}
// // 			const delta = downloadedBytes - lastDownloadedBytes;
// // 			lastDownloadedBytes = downloadedBytes;
// // 			progressBar.tick(delta);
// // 		}

// // 		function toMegabytes(bytes) {
// // 			const mb = bytes / 1024 / 1024;
// // 			return `${Math.round(mb * 10) / 10} Mb`;
// // 		}

// // 		function generateProtocolTypesIfNecessary(updated) {
// // 			const fs = require("fs");
// // 			const path = require("path");
// // 			if (!fs.existsSync(path.join(__dirname, "utils", "protocol-types-generator"))) return;
// // 			if (!updated && fs.existsSync(path.join(__dirname, "lib", "protocol.d.ts"))) return;
// // 			return require("./utils/protocol-types-generator");
// // 		}

// // 		function logPolitely(toBeLogged) {
// // 			const logLevel = process.env.npm_config_loglevel;
// // 			const logLevelDisplay = ["silent", "error", "warn"].indexOf(logLevel) > -1;

// // 			if (!logLevelDisplay) console.log(toBeLogged);
// // 		}
// // 	} catch (e) {
// // 		/**
// // 		 * @param {!Error} error
// // 		 */
// // 		function onError(error) {
// // 			console.error(
// // 				`ERROR: Failed to download Chromium r${revision}! Set "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD" env variable to skip download.`
// // 			);
// // 			console.error(error);
// // 			process.exit(1);
// // 		}

// // 		onError(e);

// // 		// throw e;
// // 	} finally {
// // 		console.log("downloadChromium finally");
// // 		process.chdir(originalDir);
// // 	}
// // }
