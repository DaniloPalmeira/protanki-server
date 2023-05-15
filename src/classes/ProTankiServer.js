const ProTankiBattleServer = require("./server/ProTankiBattle");
const maps = require("../maps/items.json");
const weapons = require("../helpers/weapons.json");
const garageItems = require("../helpers/garage/items.json");
const { getNews } = require("../helpers/db");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const database = require("../helpers/connection");

const logger = require("../helpers/logger");

class ProTankiServer {
	constructor() {
		logger.debug("Construindo servidor ProTanki.");
		this.id = 1;
		this.users = {};
		this.clients = [];

		database.sync({ alter: true });

		this.weapons = weapons;
		this.maps = maps;
		this.mapsNames = {
			pt_BR: require("../maps/i18n/pt_BR.json"),
			en: require("../maps/i18n/en.json"),
			ru: require("../maps/i18n/ru.json"),
		};

		this.resources = require("../helpers/resources.json");

		this.battleList = {};
		this.captchaLocations = [];
		this.linksWhiteList = ["http://gtanks-online.com/", "http://vk.com/ebal"];
		this.requireInviteCode = false;
		this.chatHistory = [];
		this.chatConfig = {
			symbolCost: 176,
			enterCost: 880,
		};
		this.loginPage = {
			background: 122842,
			email: false,
			maxLength: 100,
			minLength: 5,
		};

		this.initializeMaps();
		this.initializeBattleLimits();
		this.initializeEquipmentProperties();
		this.initializeGarageProperties();
		this.initializeRegularBattles();
		this.initializeNewsList();
		this.initializePhysics();
	}

	initializeMaps() {
		this.mapsInfos = this.readJSONFilesFromDirectory("../maps/properties");
	}

	initializePhysics() {
		this.physics = this.readJSONFilesFromDirectory("../helpers/garage/physics");
	}

	resourceByIdList(items) {
		const resources = [];
		for (const key of items) {
			if (this.resources.hasOwnProperty(key)) {
				resources.push(this.resources[key]);
			} else {
				logger.error(`${key} não existe no arquivo de resources`);
			}
		}
		return resources;
	}

	async initializeNewsList() {
		this.newsList = await getNews();
	}

	initializeBattleLimits() {
		logger.debug("Inicializando limites de batalha no servidor.");
		this.battleLimits = [
			{ battleMode: "DM", scoreLimit: 999, timeLimitInSec: 59940 },
			{ battleMode: "TDM", scoreLimit: 999, timeLimitInSec: 59940 },
			{ battleMode: "CTF", scoreLimit: 999, timeLimitInSec: 59940 },
			{ battleMode: "CP", scoreLimit: 999, timeLimitInSec: 59940 },
			{ battleMode: "AS", scoreLimit: 999, timeLimitInSec: 59940 },
		];
	}

	initializeEquipmentProperties() {
		logger.debug("Inicializando propriedades de equipamento.");
		this.paintProperties = require("../helpers/garage/properties/paint.json");
		this.armorProperties = require("../helpers/garage/properties/armor.json");
		this.weaponProperties = require("../helpers/garage/properties/weapon.json");
	}

	initializeGarageProperties() {
		logger.debug("Inicializando propriedades de garagem.");
		this.garageItems = this.initializeGarageItems(
			garageItems,
			this.paintProperties,
			this.armorProperties,
			this.weaponProperties
		);

		this.garage = {
			items: this.garageItems,
			delayMountArmorInSec: 0,
			delayMountWeaponInSec: 0,
			delayMountColorInSec: 0,
		};
	}

	initializeRegularBattles() {
		logger.debug("Inicializando batalhas regulares no servidor.");
		const battles = [
			{
				id: "abcdef9876543210",
				mode: 1,
				map: "map_silence_moon",
				maxPeople: 20,
				name: "Rank+ | No Kill |",
				scoreLimit: 0,
				pro: true,
				minRank: 1,
				maxRank: 30,
				reArmorEnabled: true,
				autoBalance: false,
				theme: 2,
				parkour: true,
			},
		];

		for (let i = 0; i < battles.length; i++) {
			const battle = battles[i];
			const nBattle = new ProTankiBattleServer({
				...battle,
				server: this,
			});
			this.battleList[battle.id] = nBattle;
		}
	}

	initializeGarageItems(
		garageItems,
		paintProperties,
		armorProperties,
		weaponProperties
	) {
		logger.debug("Inicializando itens na garagem.");
		const requiredPaintProperties = ["resistances", "preview", "coloring"];

		return garageItems.filter((item) => {
			switch (item.category) {
				case "paint": {
					const itemPaintProperties = paintProperties[item.id];

					if (!itemPaintProperties) {
						return false; // Remove the item from the list
					}

					const hasAllProperties = requiredPaintProperties.every(
						(property) => property in itemPaintProperties
					);

					if (!hasAllProperties) {
						return false; // Remove the item from the list
					}

					const resistances = itemPaintProperties.resistances;
					const properts = Object.entries(resistances || {}).map(
						([property, value]) => ({
							property,
							value: value.value,
							subproperties: value.subproperties,
						})
					);

					item.baseItemId = itemPaintProperties.preview;
					item.previewResourceId = itemPaintProperties.preview;
					item.coloring = itemPaintProperties.coloring;
					item.properts = properts;

					return true; // Keep the item in the list
				}

				case "armor":
				case "weapon": {
					const itemProperties =
						item.category === "armor"
							? armorProperties[item.id]
							: weaponProperties[item.id];

					if (!itemProperties || !itemProperties[item.modificationID]) {
						return false; // Remove the item from the list
					}

					const { object3ds, baseItemId, previewResourceId, propers } =
						itemProperties[item.modificationID];

					item.properts = this.PropertiesToArmor(propers);
					item.object3ds = object3ds;
					item.baseItemId = baseItemId;
					item.previewResourceId = previewResourceId;

					return true; // Keep the item in the list
				}

				default:
					return true; // Keep the item in the list
			}
		});
	}

	PropertiesToArmor(originalObject) {
		originalObject = JSON.parse(JSON.stringify(originalObject));
		const transformedObject = [];

		// Percorre cada propriedade do objeto original
		for (const property in originalObject) {
			if (originalObject.hasOwnProperty(property)) {
				const currentProp = originalObject[property];

				if (currentProp.subproperties !== null) {
					// Se a propriedade tiver subpropriedades, adiciona elas como um objeto aninhado
					const subproperties = [];
					for (const subprop of currentProp.subproperties) {
						subproperties.push({
							property: subprop,
							value: originalObject[subprop].value,
							subproperties: null,
						});

						delete originalObject[subprop];
					}

					// Adiciona a propriedade principal como um objeto no resultado, mas com "subproperties" definido como um array aninhado
					transformedObject.push({
						property: property,
						value: currentProp.value,
						subproperties: subproperties.length > 0 ? subproperties : null,
					});
				} else {
					// Se a propriedade não tiver subpropriedades, adiciona ela como um objeto separado no resultado
					transformedObject.push({
						property: property,
						value: currentProp.value,
						subproperties: null,
					});
				}
			}
		}

		return transformedObject;
	}

	readJSONFilesFromDirectory(directoryPath) {
		const jsonData = {};

		function readFilesRecursively(dir, parentKey, commonData) {
			const files = fs.readdirSync(dir);

			files.forEach((file) => {
				const filePath = path.join(dir, file);
				const fileExtension = path.extname(file);

				if (fs.statSync(filePath).isDirectory()) {
					const directoryName = path.basename(file);
					const newKey = parentKey
						? `${parentKey}.${directoryName}`
						: directoryName;

					const commonFilePath = path.join(dir, "common.json");
					if (fs.existsSync(commonFilePath)) {
						const commonFileContent = fs.readFileSync(commonFilePath, "utf-8");
						const commonFileData = JSON.parse(commonFileContent);
						if (parentKey) {
							commonData[newKey] = _.merge(
								{},
								commonData[parentKey],
								commonFileData
							);
						} else {
							commonData[newKey] = commonFileData;
						}
					}

					readFilesRecursively(filePath, newKey, commonData);
				} else if (fileExtension === ".json") {
					const fileContent = fs.readFileSync(filePath, "utf-8");
					const fileData = JSON.parse(fileContent);
					const fileName = path.basename(file, fileExtension);

					if (parentKey) {
						if (!jsonData[parentKey]) {
							jsonData[parentKey] = {};
						}

						if (fileName === "common") {
							commonData[parentKey] = _.merge(
								{},
								commonData[parentKey],
								fileData
							);
						} else {
							jsonData[parentKey][fileName] = _.merge(
								{},
								commonData[parentKey],
								fileData
							);
						}
					} else {
						jsonData[fileName] = fileData;
					}
				}
			});

			if (parentKey && commonData[parentKey]) {
				delete commonData[parentKey];
			}
		}

		const fullDirectoryPath = path.join(__dirname, directoryPath);
		readFilesRecursively(fullDirectoryPath, null, {});

		if (jsonData.common) {
			delete jsonData.common;
		}

		return jsonData;
	}

	/**
	 * @param {number} length
	 */
	randomID(length) {
		let result = "";
		const characters = "abcdef0123456789";
		const charactersLength = characters.length;
		for (let i = 0; i < length; i++) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	}

	addClient(client) {
		if (!this.clients.includes(client)) {
			this.clients.push(client);
		}
	}

	removeClient(client) {
		const index = this.clients.indexOf(client);
		if (index > -1) {
			this.clients.splice(index, 1);
		}
	}
}

module.exports = ProTankiServer;
