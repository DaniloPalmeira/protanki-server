const ProTankiBattleServer = require("./server/ProTankiBattle");
const maps = require("../helpers/map/items.json");
const weapons = require("../helpers/weapons.json");
const garageItems = require("../helpers/garage/items.json");
const { getNews } = require("../helpers/db");

const logger = require("../helpers/logger");

class ProTankiServer {
	constructor() {
		this.id = 1;
		this.users = {};
		this.clients = [];
		this.ClientfromUID = {};
		this.UIDfromClient = {};

		// database.sync({ alter: true });

		this.weapons = weapons;
		this.maps = maps;
		this.mapsNames = {
			pt_BR: require("../helpers/map/i18n/pt_BR.json"),
			en: require("../helpers/map/i18n/en.json"),
			ru: require("../helpers/map/i18n/ru.json"),
		};
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

		this.battleLimits = [
			{ battleMode: "DM", scoreLimit: 999, timeLimitInSec: 59940 },
			{ battleMode: "TDM", scoreLimit: 999, timeLimitInSec: 59940 },
			{ battleMode: "CTF", scoreLimit: 999, timeLimitInSec: 59940 },
			{ battleMode: "CP", scoreLimit: 999, timeLimitInSec: 59940 },
			{ battleMode: "AS", scoreLimit: 999, timeLimitInSec: 59940 },
		];

		this.paintProperties = require("../helpers/garage/properties/paint.json");
		this.armorProperties = require("../helpers/garage/properties/armor.json");
		this.weaponProperties = require("../helpers/garage/properties/weapon.json");

		this.garageItems = garageItems.filter((item) => {
			if (item.category === "paint" && this.paintProperties[item.id]) {
				const requiredProperties = ["resistances", "preview", "coloring"];
				const hasAllProperties = requiredProperties.every(
					(prop) => prop in this.paintProperties[item.id]
				);
				if (hasAllProperties) {
					const properties = this.paintProperties[item.id].resistances;
					const properts = Object.entries(properties || {}).map(
						([property, value]) => ({
							property,
							value: value.value,
							subproperties: value.subproperties,
						})
					);

					item.baseItemId = this.paintProperties[item.id].preview;
					item.previewResourceId = this.paintProperties[item.id].preview;
					item.coloring = this.paintProperties[item.id].coloring;
					item.properts = properts;

					return true; // Mantém o item na lista
				} else {
					return false; // Remove o item da lista
				}
			} else if (item.category === "armor" && this.armorProperties[item.id]) {
				const { object3ds, baseItemId, previewResourceId } =
					this.armorProperties[item.id][item.modificationID];
				item.properts = this.PropertiesToArmor(
					this.armorProperties[item.id][item.modificationID].propers
				);
				item.object3ds = object3ds;
				item.baseItemId = baseItemId;
				item.previewResourceId = previewResourceId;
			} else if (item.category === "weapon" && this.weaponProperties[item.id]) {
				const { object3ds, baseItemId, previewResourceId } =
					this.weaponProperties[item.id][item.modificationID];
				item.properts = this.PropertiesToArmor(
					this.weaponProperties[item.id][item.modificationID].propers
				);
				item.object3ds = object3ds;
				item.baseItemId = baseItemId;
				item.previewResourceId = previewResourceId;
			}
			return true;
		});

		this.garage = {
			items: this.garageItems,
			delayMountArmorInSec: 0,
			delayMountWeaponInSec: 0,
			delayMountColorInSec: 0,
		};

		[
			{
				id: "1c976322891c6e46",
				mode: 0,
				map: "map_cross",
				maxPeople: 20,
				name: "Batalha Inicial",
				pro: false,
				minRank: 1,
				maxRank: 30,
				reArmorEnabled: true,
				parkour: false,
				scoreLimit: 0,
			},
		].forEach((battle) => {
			const nBattle = new ProTankiBattleServer({
				...battle,
				server: this,
			});
			this.battleList[battle.id] = nBattle;
		});

		this.getNews();

		logger.debug("Classe do servidor carregada !");
	}

	async getNews() {
		this.newsList = await getNews();
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

	/**
	 * @param {number} length
	 */
	randomID(length) {
		let result = "";
		const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
		const charactersLength = characters.length;
		for (let i = 0; i < length; i++) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	}

	addClient(client) {
		if (this.clients.indexOf(client) === -1) {
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
