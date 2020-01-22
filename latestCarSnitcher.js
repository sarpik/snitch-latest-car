// latestCarSnitcher.js
/**
 * Copyright © Kipras Melnikovas (https://kipras.org) <kipras@kipras.org>
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

const url = "https://www.vaurioajoneuvo.fi/";
const recentlyAddedVehiclesUrl = "https://www.vaurioajoneuvo.fi/?mod=vehicle&act=lastest";

/**
 * @type {puppeteer.WaitForSelectorOptions}
 *
 * TODO - actually skip the current element if the waiting failed
 * See https://github.com/sarpik/snitch-latest-car/issues/16
 */
const pageWaitForSelectorOptions = {
	timeout: 1000 * 5 /** wait a maximum of 5 seconds before cancelling */,
};

/**
 * Workflow:
 *
 * 0. launch the browser
 * 1. go to the main url
 * 2. authenticate
 * 3. go to the "latest updated cars" page
 * 4. start looping infinitely
 * 4.1 keep track of previously & currently available cars
 * 4.2 refresh the page until a newer car/cars with different IDs appear
 * 4.3 for each newly detected car:
 * 4.3.1 scroll down to the bottom of the newer car info page
 * 4.3.2 click the "buy now" button to navigate to another page
 * 4.3.5 click on the input field for "identification number"
 * 4.3.6 paste the identification number (always the same)
 * 4.3.7 click "continue shopping" - the car is reserved for 5 minutes
 * 4.3.8 click "go back"
 * 4.3.9? notify the user that we've snitched something
 * 4.4 repeat - go to step 4.
 *
 * NOTE
 * if a selector does not work, make sure it's unique
 * if it's not, use the full xpath instead.
 *
 * @returns {Promise<never>}
 */
// export const latestCarSnitcher = async () => {
const latestCarSnitcher = async () => {
	/** @type {import("./config.example" )} */
	const config = getConfig();

	const executablePath = getExecutablePath();

	const browser = await puppeteer.launch({
		executablePath: executablePath,
		headless: config.headless,
	});

	const page = await browser.newPage();
	await page.goto(url);

	await authenticate(page, config.username, config.password);

	await page.goto(recentlyAddedVehiclesUrl);

	/**
	 * Here we keep track of the previous & the current vehicles' IDs.
	 *
	 * If they aren't equal, it means that a new car has been spotted
	 * and thus we go on and try to snitch it real quick!
	 *
	 */

	/** @type {number[]} */
	let previousVehicleIds = [];

	/** @type {number[]} */
	let currentVehicleIds = await getIdsOfLatestVehicles(page, config.howManyLatestCarsToWatch);

	console.log("initial `currentVehicleIds` =", currentVehicleIds);

	while (true) {
		previousVehicleIds = currentVehicleIds;
		currentVehicleIds = await getIdsOfLatestVehicles(page, config.howManyLatestCarsToWatch);

		/** @type {number[]} */
		const previouslyUnseenVehicleIds = [];

		/**
		 * Find all IDs that have not been seen previously
		 */

		for (const currentId of currentVehicleIds) {
			/** nothing new */
			if (previousVehicleIds.includes(currentId)) {
				continue;
			}

			/** a new ID has appeared! */
			previouslyUnseenVehicleIds.push(currentId);
		}

		if (!previouslyUnseenVehicleIds.length) {
			/** nothing new - refresh & try again */
			await page.reload();

			/** TODO - add some timeout maybe? */
			continue;
		}

		/** we have found one or more new cars' IDs */

		console.log("new `previouslyUnseenVehicleIds` =", previouslyUnseenVehicleIds);

		/**
		 * Snitch all them newly spotted vehicles baby! 🔭🔭
		 */
		await Promise.all(
			previouslyUnseenVehicleIds.map(async (previouslyUnseenVehicleId) => {
				const pageForSnitchingTheVehicle = await browser.newPage();
				const latestVehiclePageUrl = getVehicleUrlById(previouslyUnseenVehicleId);

				pageForSnitchingTheVehicle.goto(latestVehiclePageUrl, {
					waitUntil: "domcontentloaded" /** avoids errors that would happen if the page wasn't loaded */,
				});

				const buyNowButtonFullXPath =
					"/html/body/div[1]/table/tbody/tr[2]/td/div/table/tbody/tr[16]/td/div/div/div[2]/input";

				await pageForSnitchingTheVehicle.waitForXPath(
					buyNowButtonFullXPath,
					pageWaitForSelectorOptions
				); /** not necessary atm */
				const buyNowButtonElement = (await pageForSnitchingTheVehicle.$x(buyNowButtonFullXPath))[0];
				await buyNowButtonElement.click();

				/**  */
				const identificationNumberInputSelector = "#b_ssn";

				await pageForSnitchingTheVehicle.waitFor(identificationNumberInputSelector, pageWaitForSelectorOptions);
				await pageForSnitchingTheVehicle.focus(identificationNumberInputSelector);
				await pageForSnitchingTheVehicle.keyboard.type(config.identificationNumber.toString());

				/**  */
				const continueShoppingButtonSelector = "#showcontent > div:nth-child(4) > form > div > input";

				await pageForSnitchingTheVehicle.waitFor(
					continueShoppingButtonSelector,
					pageWaitForSelectorOptions
				); /** not necessary atm */
				await pageForSnitchingTheVehicle.click(continueShoppingButtonSelector);

				/**
				 * take care of edge cases
				 *
				 * Currently, we cannot do anything about them
				 * & thus just close the browser tab
				 * to allow other pages to process stuff
				 *
				 */
				if (await isVehicleCurrentlyReservedBySomeoneElse(pageForSnitchingTheVehicle)) {
					/** TODO - we could try again later */

					console.warn("- Vehicle was already RESERVED, `id` =", previouslyUnseenVehicleId);

					await pageForSnitchingTheVehicle.close();
					return; /** return so the next item in the array can be `.map`ped through */
				}

				if (await hasVehicleAlreadyBeenBought(pageForSnitchingTheVehicle)) {
					console.warn("- Vehicle was already BOUGHT, `id` =", previouslyUnseenVehicleId);

					await pageForSnitchingTheVehicle.close();
					return; /** return so the next item in the array can be `.map`ped through */
				}

				/**  */
				const goBackButtonSelector =
					"#showcontent > div:nth-child(3) > table > tbody > tr:nth-child(8) > td > div > input:nth-child(1)";

				await pageForSnitchingTheVehicle.waitFor(goBackButtonSelector, pageWaitForSelectorOptions);
				await pageForSnitchingTheVehicle.click(goBackButtonSelector);

				const loggingData = {
					id: previouslyUnseenVehicleId,
					date: new Date().toISOString(),
					url: getVehicleUrlById(previouslyUnseenVehicleId),
				};

				console.table(loggingData);

				await pageForSnitchingTheVehicle.close();
			})
		);
	}
};

/**
 * wrapped into an `eval` so that it's not included in the binary
 * & thus a `config.js` file must be provided
 * when using the executable,
 * which is what we wanted in the first place - customisability
 *
 * @returns {import("./config.example" )}
 */
function getConfig() {
	// // const configFilePath = path.join(__dirname, "config.js");
	const configFilePath = "config.js";

	const configFile = fs.readFileSync(configFilePath, { encoding: "utf-8" });

	/** @type {import("./config.example") } */
	const config = eval(configFile);

	// // const config = require("./config");

	return config;
}

/**
 * see https://github.com/zeit/pkg/issues/204#issuecomment-536323464
 *
 * @returns {string}
 */
function getExecutablePath() {
	const executablePath =
		process.env.PUPPETEER_EXECUTABLE_PATH ||
		(process.pkg
			? path.join(
					path.dirname(process.execPath),
					"puppeteer",
					...puppeteer
						.executablePath()
						.split(path.sep)
						.slice(6) // /snapshot/project/node_modules/puppeteer/.local-chromium
			  )
			: puppeteer.executablePath());

	return executablePath;
}

/**
 * @param {puppeteer.Page} page
 * @param {string} username
 * @param {string} password
 *
 * @returns {Promise<void>}
 */
async function authenticate(page, username, password) {
	const usernameSelector = "#username";
	const passwordSelector = "#password";
	const submitSelector = "#submit";

	// // await page.$eval(usernameSelector, (element) => {
	// // 	console.log("element", element);
	// // 	element.value = username;
	// // });

	await page.focus(usernameSelector);
	await page.keyboard.type(username);

	await page.focus(passwordSelector);
	await page.keyboard.type(password);

	await page.click(submitSelector);
}

/**
 * @param {puppeteer.Page} page
 * @param {number} [howMany=1]
 *
 * @returns {Promise<number[]>}
 */
async function getIdsOfLatestVehicles(page, howMany = 1) {
	/**
	 * @NOTE this is an `id`, but it's **not** unique
	 * & they use it like a `class`
	 */
	const aHrefXPath = '//*[@id="vehdetail"]/a';

	/** @type {puppeteer.ElementHandle<Element>[]} */
	const vehicleHrefElements = await (await page.$x(aHrefXPath)).splice(0, howMany);

	/** @type {number[]} */
	const vehicleIds = await Promise.all(
		vehicleHrefElements.map(async (vehicleHrefElement) => {
			const onclickHandlerProperty = await vehicleHrefElement.getProperty("onclick");
			const onclickHandlerValue = getOnClickHandlerValue(onclickHandlerProperty);
			const currentVehicleId = parseVehicleIDFromOnclick(onclickHandlerValue);

			return currentVehicleId;
		})
	);

	return vehicleIds;
}

/**
 * @param {puppeteer.JSHandle<any>} onclickHandlerProperty
 *
 * @returns {string}
 */
function getOnClickHandlerValue(onclickHandlerProperty) {
	/** @type {string} */
	const valueStr = onclickHandlerProperty._remoteObject.description;

	return valueStr;
}

/**
 * @param {string} onclickAttributeStr
 * @example
 * ```js
 * function onclick(event) {
 * viewdetail('37640','1579264877_1347363_9336478.jpg');
 * }
 * ```
 *
 * @returns {number}
 * @example 37640
 */
function parseVehicleIDFromOnclick(onclickAttributeStr) {
	/** @type {string} */
	const idStr = onclickAttributeStr.split("'")[1];
	/**   ` function onclick(event) { viewdetail('37640','1579264877_1347363_9336478.jpg'); }` */
	/** `[" function onclick(event) { viewdetail(", "37640", ",", "1579264877_1347363_9336478.jpg", "); }"]` */
	/**                                            `"37640"` */

	/** @type {number} */
	const idNum = Number(idStr);

	if (isNaN(idNum)) {
		console.error(
			`failed to \`parseVehicleIDFromOnclick\`! provided \`onclickAttributeStr\` was ${onclickAttributeStr}`
		);
	}

	return idNum;
}

/**
 * See also `parseVehicleIDFromOnclick`
 *
 * @param {string} onclickAttributeStr
 *
 * @returns {string}
 */
function parseVehicleImageFilenameFromOnclick(onclickAttributeStr) {
	/** @type {string} */
	const imageFilename = onclickAttributeStr.split("'")[3];
	/**   ` function onclick(event) { viewdetail('37640','1579264877_1347363_9336478.jpg'); }` */
	/** `[" function onclick(event) { viewdetail(", "37640", ",", "1579264877_1347363_9336478.jpg", "); }"]` */
	/**                                                          `"1579264877_1347363_9336478.jpg"` */

	return imageFilename;
}

/**
 * We want to be able to click on a vehicle's card to navigate to it,
 * but that is disabled by the website.
 *
 * Istead, they use their `viewdetail` function (available globally),
 * and after logging it @ the devtools console,
 * I found the query parameters that need to be passed in
 * in order to get a URL
 * that will show you the wanted vehicle.
 *
 * And this function just allows you to pass in an ID
 * and get back a URL that you can now open
 * to view the specific vehicle's info page.
 *
 *
 * @param {number} vehicleId
 * @param {string} [imageFilename=null]
 *
 * @returns {string}
 */
const getVehicleUrlById = (vehicleId, imageFilename = null) =>
	`${url}?mod=ajveh&act=nview&id=${vehicleId}&img=${imageFilename}`;

/**
 *
 * @param {puppeteer.Page} page
 * @param {string} xpath
 * @param {string} propertyName
 *
 * @returns {Promise<puppeteer.JSHandle<any>>}
 */
async function getPropertyByXPath(page, xpath, propertyName) {
	const [element] = await page.$x(xpath);
	const rawProperty = await element.getProperty(propertyName);

	return rawProperty;
}

/**
 * handle the case where a car might
 * currently be reserved by someone else,
 * thus skipping it
 *
 * TODO maybe add it to the waitlist & try again later?
 *
 * See also:
 * https://www.vaurioajoneuvo.fi/?mod=vehicle&act=view&id=37228&img=MTU3NjQ4Mzc0NV8xMzM4MjE1XzkxNDcxNDguanBn
 *
 * @param {puppeteer.Page} vehiclePage
 *
 * @returns {Promise<boolean>}
 */
const isVehicleCurrentlyReservedBySomeoneElse = async (vehiclePage) => {
	/** /html/body/div[2]/div[3]/div[2]/div[2] */
	const vehicleIsCurrentlyReservedBySomeoneElseSelector = "#content > div.area_notice_container";

	return await doesElementExist(vehiclePage, vehicleIsCurrentlyReservedBySomeoneElseSelector);
};

/**
 * @param {puppeteer.Page} vehiclePage
 *
 * @returns {Promise<boolean>}
 */
const hasVehicleAlreadyBeenBought = async (vehiclePage) => {
	const vehicleHasAlreadyBeenBoughtSelector = "#showcontent > div > b > a";

	return await doesElementExist(vehiclePage, vehicleHasAlreadyBeenBoughtSelector);
};

/**
 * @param {puppeteer.Page} vehiclePage
 * @param {string} selector
 *
 * @returns {Promise<boolean>}
 */
const doesElementExist = async (vehiclePage, selector) => {
	/** @type {puppeteer.ElementHandle<Element>|null} */
	let element;

	/** @type {boolean} */
	let doesItExist;

	try {
		element = await vehiclePage.$(selector);
		doesItExist = element ? true : false;
	} catch (e) {
		/** not found - all good */
		doesItExist = false;
	}

	return doesItExist;
};

module.exports = {
	latestCarSnitcher,
};
