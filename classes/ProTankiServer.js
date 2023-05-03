const ProTankiBattleServer = require("./server/ProTankiBattle");
const maps = require("../helpers/maps.json");
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

		this.paintProperties = require("../helpers/garage/paints/properties.json");

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
