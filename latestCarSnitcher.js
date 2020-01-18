// latestCarSnitcher.js
/**
 * Copyright © Kipras Melnikovas (https://kipras.org) <kipras@kipras.org>
 */

/* eslint-disable @typescript-eslint/no-use-before-define */

import puppeteer from "puppeteer";
import config from "./config.js";

const url = "https://www.vaurioajoneuvo.fi/";
const recentlyAddedVehiclesUrl = "https://www.vaurioajoneuvo.fi/?mod=vehicle&act=lastest";

/**
 * Workflow:
 *
 * 0. launch the browser
 * 1. go to the main url
 * 2. authenticate
 * 3. Go to the latest update car page
 * 4. get the latest car's ~~image~~ ID
 * 5. compare it with the stored one
 * 5.1 if they          are     equal - refresh page & go to step 4.
 * 5.2 otherwise - they are NOT equal - store it as the latest car's ID
 * 6. scroll down to the bottom of the car's info page
 * 7. click the "buy now" button to navigate to another page
 * 8. click on the input field for "identification number"
 * 9. paste the identification number (always the same)
 * 10. click "continue shopping" - the car is reserved for 5 minutes
 * 11. click "go back"
 * 12?. notify the user that we've captured something
 * 13. exit OR repeat?
 *
 * NOTE
 * if a selector does not work, make sure it's unique
 * if it's not, use the full xpath instead.
 *
 * @returns {Promise<void>}
 */
export const latestCarSnitcher = async () => {
	const browser = await puppeteer.launch({
		headless: config.headless,
	});

	const page = await browser.newPage();
	await page.goto(url);

	await authenticate(page, config.username, config.password);

	await page.goto(recentlyAddedVehiclesUrl);

	/** @type {(number|null)} */
	let latestVehicleId = null;

	while (true) {
		const currentVehicleId = await getCurrentVehicleId(page);

		if (currentVehicleId === latestVehicleId) {
			/** nothing new - refresh & try again */
			await page.reload();

			/** TODO - add some timeout maybe? */
			continue;
		}

		latestVehicleId = currentVehicleId;
		break;
	}

	console.log("latestVehicleId", latestVehicleId);

	const buyNowButtonFullXPath =
		"/html/body/div[2]/div[3]/div[2]/div/div[2]/div[2]/table/tbody/tr[2]/td/div/table/tbody/tr[16]/td/div/div/div[2]/input";

	await page.waitForXPath(buyNowButtonFullXPath); /** not necessary atm */
	const buyNowButtonElement = (await page.$x(buyNowButtonFullXPath))[0];
	await buyNowButtonElement.click();

	/**  */
	const identificationNumberInputSelector = "#b_ssn";

	await page.waitFor(identificationNumberInputSelector);
	await page.focus(identificationNumberInputSelector);
	await page.keyboard.type(config.identificationNumber.toString());

	/**  */
	const continueShoppingButtonSelector = "#showcontent > div:nth-child(4) > form > div > input";

	await page.waitFor(continueShoppingButtonSelector); /** not necessary atm */
	await page.click(continueShoppingButtonSelector);

	/**  */
	const goBackButtonSelector =
		"#showcontent > div:nth-child(3) > table > tbody > tr:nth-child(8) > td > div > input:nth-child(1)";

	await page.waitFor(goBackButtonSelector);
	await page.click(goBackButtonSelector);

	// eslint-disable-next-line no-extra-boolean-cast
	if (!!config.headless || !!config.shouldCloseBrowserOnceDone) {
		await page.close({});
		await browser.close();
	}

	return;
};

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
 *
 * @returns {Promise<number>}
 */
async function getCurrentVehicleId(page) {
	const aHrefXPath = '//*[@id="vehdetail"]/a';

	const onclickHandlerProperty = await getPropertyByXPath(page, aHrefXPath, "onclick");
	const onclickHandlerValue = getOnClickHandlerValue(onclickHandlerProperty);
	const currentVehicleId = parseVehicleIDFromOnclick(onclickHandlerValue);

	return currentVehicleId;
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
