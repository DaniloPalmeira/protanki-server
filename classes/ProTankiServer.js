const ProTankiBattleServer = require("./server/ProTankiBattle");
const maps = require("../helpers/maps.json");
const weapons = require("../helpers/weapons.json");
const garage = require("../helpers/garage.json");
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
		this.captchaLocations = [0, 1, 2, 3, 4, 5];
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
		this.garage = garage;

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
