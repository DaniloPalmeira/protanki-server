const ByteArray = require("../ByteArray");
const maps = require("../../helpers/map/items.json");

function removerItem(lista, item) {
	let index = lista.indexOf(item);
	if (index !== -1) {
		lista.splice(index, 1);
	}
}

class ProTankiBattle {
	_autoBalance = true;
	spectators = [];
	clients = [];
	mode = 0;
	modeString = {
		0: "DM",
		1: "TDM",
		2: "CTF",
		3: "CP",
		4: "AS",
	};
	equip = 0;
	equipString = {
		0: "NONE",
		1: "HORNET_RAILGUN",
		2: "WASP_RAILGUN",
		3: "HORNET_WASP_RAILGUN",
	};
	friendlyFire = false;
	scoreLimit = 0;
	timeLimitInSec = 0;
	map = null;
	maxPeople = 0;
	name = null;
	parkour = false;
	private = false;
	pro = false;
	maxRank = 0;
	minRank = 0;
	reArmorEnabled = true;
	theme = 0;
	themeString = {
		0: "SUMMER",
		1: "WINTER",
		2: "SPACE",
		3: "SUMMER_DAY",
		4: "SUMMER_NIGHT",
		5: "WINTER_DAY",
	};
	withoutBonuses = false;
	withoutCrystals = false;
	withoutSupplies = false;
	withoutUpgrades = true;
	id = null;
	gravity = 1000;
	proBattleEnterPrice = 150;
	roundStarted = false;
	suspicionLevel = "NONE"; // NONE, LOW, HIGH
	preview = 0;
	viewers = [];
	fund = 0;

	bonusId = 0;

	usersBlue = [];
	usersRed = [];
	users = [];

	score = {};

	bonusList = [];

	ctf = {
		red: {
			base: { x: -23250, y: -5250, z: 80 },
			flag: { x: -20250, y: -5250, z: 80 },
			holder: null,
			lastAction: new Date(),
		},
		blue: {
			base: { x: -14250, y: 3750, z: 80 },
			flag: {},
			holder: null,
			lastAction: new Date(),
		},
	};

	constructor(objData) {
		Object.assign(this, objData);
		this.definePreview();
	}

	get userListByTeam() {
		return {
			none: this.users.map((user) => {
				return user;
			}),
			red: this.usersRed.map((user) => {
				return user;
			}),
			blue: this.usersBlue.map((user) => {
				return user;
			}),
		};
	}

	get usernameList() {
		return {
			none: this.users.map((user) => {
				return user.username;
			}),
			red: this.usersRed.map((user) => {
				return user.username;
			}),
			blue: this.usersBlue.map((user) => {
				return user.username;
			}),
		};
	}

	get userInfosList() {
		function getParams(user) {
			return {
				user: user.username,
				kills: user.battle.kills,
				score: user.battle.score,
				suspicious: false,
			};
		}
		return {
			none: this.users.map((user) => {
				return getParams(user);
			}),
			red: this.usersRed.map((user) => {
				return getParams(user);
			}),
			blue: this.usersBlue.map((user) => {
				return getParams(user);
			}),
		};
	}

	get modeInt() {
		return parseInt(this.mode);
	}

	set modeInt(value) {
		if (!isNaN(value)) {
			this.mode = parseInt(value);
		} else {
			this.mode = 0;
			console.log(`O valor recebido não é um int`);
		}
	}

	get modeStr() {
		return this.modeString[this.mode];
	}

	set modeStr(value) {
		if (typeof value === "string") {
			const index = Object.values(this.modeString).indexOf(this.mode);
			this.mode = index !== -1 ? index : 0;
		} else {
			this.mode = 0;
			console.log(`O valor recebido não é uma string`);
		}
	}

	get themeInt() {
		return parseInt(this.theme);
	}

	set themeInt(value) {
		if (!isNaN(value)) {
			this.theme = parseInt(value);
		} else {
			this.theme = 0;
			console.log(`O valor recebido não é um int`);
		}
	}

	get themeStr() {
		return this.themeString[this.theme];
	}

	set themeStr(value) {
		if (typeof value === "string") {
			const index = Object.values(this.themeString).indexOf(this.theme);
			this.theme = index !== -1 ? index : 0;
		} else {
			this.theme = 0;
			console.log(`O valor recebido não é uma string`);
		}
	}

	get equipInt() {
		return parseInt(this.equip);
	}

	set equipInt(value) {
		if (!isNaN(value)) {
			this.equip = parseInt(value);
		} else {
			this.equip = 0;
			console.log(`O valor recebido não é um int`);
		}
	}

	get equipStr() {
		return this.equipString[this.equip];
	}

	set equipStr(value) {
		if (typeof value === "string") {
			const index = Object.values(this.equipString).indexOf(this.equip);
			this.equip = index !== -1 ? index : 0;
		} else {
			this.equip = 0;
			console.log(`O valor recebido não é uma string`);
		}
	}

	get effects() {
		return { effects: [] };
	}

	get battleToList() {
		var obj = {
			battleId: this.id,
			battleMode: this.modeStr,
			map: this.map,
			maxPeople: this.maxPeople,
			name: this.name,
			privateBattle: this.private,
			proBattle: this.pro,
			minRank: this.minRank,
			maxRank: this.maxRank,
			preview: this.preview,
			parkourMode: this.parkour,
			equipmentConstraintsMode: this.equipStr,
			suspicionLevel: this.suspicionLevel,
		};
		if (this.modeStr == "DM") {
			obj.users = this.usernameList["none"];
		} else {
			obj.usersBlue = this.usernameList["blue"];
			obj.usersRed = this.usernameList["red"];
		}
		return obj;
	}

	get new() {
		const showData = {
			battleId: this.id,
			battleMode: this.modeStr,
			map: this.map,
			maxPeople: this.maxPeople,
			name: this.name,
			privateBattle: this.private,
			proBattle: this.pro,
			minRank: this.minRank,
			maxRank: this.maxRank,
			preview: this.preview,
			parkourMode: this.parkour,
			equipmentConstraintsMode: this.equipStr,
			suspicionLevel: this.suspicionLevel,
		};

		if (this.modeStr == "DM") {
			showData.users = this.usernameList["none"];
		} else {
			showData.usersBlue = this.usernameList["blue"];
			showData.usersRed = this.usernameList["red"];
		}

		return showData;
	}

	get show() {
		var showData = {
			battleMode: this.modeStr,
			itemId: this.id,
			scoreLimit: this.scoreLimit,
			timeLimitInSec: this.timeLimitInSec,
			preview: this.preview,
			maxPeopleCount: this.maxPeople,
			name: this.name,
			minRank: this.minRank,
			maxRank: this.maxRank,
			proBattleEnterPrice: this.proBattleEnterPrice,
			timeLeftInSec: -1677704464,
			proBattleTimeLeftInSec: -1,
			equipmentConstraintsMode: this.equipStr,
			userPaidNoSuppliesBattle: false, // tem o cartão batalha pro ?
			spectator: false,
		};
		if (this.modeStr == "DM") {
			showData.users = this.userInfosList["none"];
		} else {
			showData.usersBlue = this.userInfosList["blue"];
			showData.usersRed = this.userInfosList["red"];
			if (this.score["blue"]) {
				showData.scoreBlue = this.score["blue"];
			}
			if (this.score["red"]) {
				showData.scoreRed = this.score["red"];
			}
			if (this.friendlyFire) {
				showData.friendlyFire = this.friendlyFire;
			}
			if (this.autoBalance) {
				showData.autoBalance = this.autoBalance;
			}
		}
		if (this.reArmorEnabled) {
			showData.reArmorEnabled = this.reArmorEnabled;
		}
		if (this.pro) {
			showData.proBattle = this.pro;
		}
		if (this.roundStarted) {
			showData.roundStarted = this.roundStarted;
		}
		if (this.parkour) {
			showData.parkourMode = this.parkour;
		}
		if (this.withoutBonuses) {
			showData.withoutBonuses = this.withoutBonuses;
		}
		if (this.withoutCrystals) {
			showData.withoutCrystals = this.withoutCrystals;
		}
		if (this.withoutSupplies) {
			showData.withoutSupplies = this.withoutSupplies;
		}
		return showData;
	}

	definePreview() {
		maps.forEach((map) => {
			if (map.mapId == this.map) {
				if (map.theme == this.themeStr) {
					this.preview = map.preview;
					this.valid = true;
				}
			}
		});
	}

	removePlayer(player) {
		removerItem(this.clients, player);
		removerItem(this.spectators, player);
		removerItem(this.users, player.user);
		removerItem(this.usersBlue, player.user);
		removerItem(this.usersRed, player.user);
	}

	sendPacketSpectator(packedID, packet = new ByteArray()) {
		this.spectators.forEach((client) => {
			console.log(client.user.username);
			var _packet = new ByteArray(packet.buffer);
			client.sendPacket(packedID, _packet);
		});
	}

	sendPacket(packedID, packet = new ByteArray(), ignore = null) {
		const allPlayers = [...this.clients, ...this.spectators];
		allPlayers.forEach((player) => {
			if (player != ignore) {
				const _packet = new ByteArray(packet.buffer);
				player.sendPacket(packedID, _packet);
			}
		});
	}

	addViewer(client) {
		if (!this.viewers.includes(client)) {
			this.viewers.push(client);
		}
	}

	removeViewer(client) {
		if (this.viewers.includes(client)) {
			this.viewers = this.viewers.filter(function (e) {
				return e !== client;
			});
		}
	}
}

module.exports = ProTankiBattle;
