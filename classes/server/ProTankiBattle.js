const ByteArray = require("../ByteArray");

class ProTankiBattle {
	clients = [];
	usernameToClient = [];
	viewers = [];
	// users = [
	// 	{
	// 		kills: 0,
	// 		score: 0,
	// 		suspicious: false,
	// 		user: "Dan",
	// 	},
	// ];
	usersStat = {};
	teams = {
		dm: [],
		red: [],
		blue: [],
	};
	battleId = ""; //string
	battleMode = "DM"; // string
	map = ""; // string
	maxPeople = 0;
	name = ""; //string
	privateBattle = false;
	proBattle = false;
	minRank = 0;
	maxRank = 0;
	preview = 0;
	parkourMode = false;
	equipmentConstraintsMode = "NONE";
	suspicionLevel = "NONE";
	reArmorEnabled = true;
	timeLimitInSec = 0;
	withoutBonuses = false;
	withoutCrystals = false;
	withoutSupplies = false;
	withoutUpgrades = false;
	proBattleEnterPrice = 150;
	roundStarted = false;
	scoreLimit = 0;
	theme = "SUMMER";
	owner = "";
	friendlyFire = false;
	autoBalance = true;
	fund = 0;

	constructor(objData) {
		Object.assign(this, objData);
		this.modeBattle = this.battleMode;
		this.equipamentsBattle = this.equipmentConstraintsMode;
		this.themeBattle = this.theme;
		this.previewBattle = this.map;
	}

	/**
	 * @param {string|number} theme
	 */
	set themeBattle(theme) {
		if (typeof theme == typeof 0) {
			switch (theme) {
				case 0:
					this.theme = "SUMMER";
					break;
				case 1:
					this.theme = "WINTER";
					break;
				case 2:
					this.theme = "SPACE";
					break;
				case 3:
					this.theme = "SUMMER_DAY";
					break;
				case 4:
					this.theme = "SUMMER_NIGHT";
					break;
				case 5:
					this.theme = "WINTER_DAY";
					break;
				default:
					this.theme = "SUMMER";
					break;
			}
		} else {
			this.theme = theme;
		}
	}

	/**
	 * @param {string|number} mode
	 */
	set modeBattle(mode) {
		if (typeof mode == typeof 0) {
			switch (mode) {
				case 0:
					this.battleMode = "DM";
					break;
				case 1:
					this.battleMode = "TDM";
					break;
				case 2:
					this.battleMode = "CTF";
					break;
				case 3:
					this.battleMode = "CP";
					break;
				case 4:
					this.battleMode = "AS";
					break;
				default:
					break;
			}
		} else {
			this.battleMode = mode;
		}
	}

	/**
	 * @param {number|string} mode
	 */
	set equipamentsBattle(mode) {
		if (typeof mode == typeof 0) {
			switch (mode) {
				case 0:
					this.equipmentConstraintsMode = "NONE";
					break;
				case 1:
					this.equipmentConstraintsMode = "HORNET_RAILGUN";
					break;
				case 2:
					this.equipmentConstraintsMode = "WASP_RAILGUN";
					break;
				case 3:
					this.equipmentConstraintsMode = "HORNET_WASP_RAILGUN";
					break;
				default:
					break;
			}
		} else {
			this.equipmentConstraintsMode = mode;
		}
	}

	/**
	 * @param {string} map
	 */
	set previewBattle(map) {
		this.preview = 952789;
		for (let index = 0; index < this.server.maps.length; index++) {
			const element = this.server.maps[index];
			if (element.mapId == map) {
				this.preview = element.preview;
				if (this.theme == element.theme) {
					this.preview = element.preview;
					break;
				}
			}
		}
	}

	get battleToList() {
		var obj = {
			battleId: this.battleId,
			battleMode: this.battleMode,
			map: this.map,
			maxPeople: this.maxPeople,
			name: this.name,
			privateBattle: this.privateBattle,
			proBattle: this.proBattle,
			minRank: this.minRank,
			maxRank: this.maxRank,
			preview: this.preview,
			parkourMode: this.parkourMode,
			equipmentConstraintsMode: this.equipmentConstraintsMode,
			suspicionLevel: this.suspicionLevel,
		};
		if (this.battleMode == "DM") {
			obj.users = this.teams.dm;
		} else {
			obj.usersBlue = this.teams.blue;
			obj.usersRed = this.teams.red;
		}
		return obj;
	}

	get users() {
		var users = this.teams.dm.map((name) => {
			return this.usersStat[name];
		});
		return users;
	}

	get usersRed() {
		var users = this.teams.red.map((name) => {
			return this.usersStat[name];
		});
		return users;
	}

	get usersBlue() {
		var users = this.teams.blue.map((name) => {
			return this.usersStat[name];
		});
		return users;
	}

	get show() {
		var showData = {
			battleMode: this.battleMode,
			itemId: this.battleId,
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
			equipmentConstraintsMode: this.equipmentConstraintsMode,
			userPaidNoSuppliesBattle: false, // tem o cartão batalha pro ?
			spectator: false,
		};
		if (this.battleMode == "DM") {
			showData.users = this.users;
		} else {
			showData.usersBlue = this.usersBlue;
			showData.usersRed = this.usersRed;
			if (this.scoreBlue) {
				showData.scoreBlue = this.scoreBlue;
			}
			if (this.scoreRed) {
				showData.scoreRed = this.scoreRed;
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
		if (this.proBattle) {
			showData.proBattle = this.proBattle;
		}
		if (this.roundStarted) {
			showData.roundStarted = this.roundStarted;
		}
		if (this.parkourMode) {
			showData.parkourMode = this.parkourMode;
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

	get new() {
		return {
			battleId: this.battleId,
			battleMode: this.battleMode,
			map: this.map,
			maxPeople: this.maxPeople,
			name: this.name,
			privateBattle: this.privateBattle,
			proBattle: this.proBattle,
			minRank: this.minRank,
			maxRank: this.maxRank,
			preview: this.preview,
			parkourMode: this.parkourMode,
			equipmentConstraintsMode: this.equipmentConstraintsMode,
			suspicionLevel: this.suspicionLevel,
			users: [],
		};
	}

	get modeInt() {
		var mode = 0;
		switch (this.battleMode) {
			case "DM":
				mode = 0;
				break;
			case "TDM":
				mode = 1;
				break;
			case "CTF":
				mode = 2;
				break;
			case "CP":
				mode = 3;
				break;
			case "AS":
				mode = 4;
				break;
			default:
				mode = 0;
				break;
		}
		return mode;
	}

	get equipmentInt() {
		var equips = 0;
		switch (this.equipmentConstraintsMode) {
			case "NONE":
				equips = 0;
				break;
			case "HORNET_RAILGUN":
				equips = 1;
				break;
			case "WASP_RAILGUN":
				equips = 2;
				break;
			case "HORNET_WASP_RAILGUN":
				equips = 3;
				break;
			default:
				equips = 0;
				break;
		}
		return equips;
	}

	get StatisticsModel() {
		var packet = new ByteArray();

		packet.writeInt(this.modeInt);
		packet.writeInt(this.equipmentInt);
		packet.writeInt(this.fund);
		packet.writeInt(this.scoreLimit);
		packet.writeInt(this.timeLimitInSec);
		packet.writeUTF(this.name);
		packet.writeInt(this.maxPeople);
		packet.writeBoolean(this.parkourMode);
		packet.writeInt(100); // premium bonus in percent
		packet.writeBoolean(false); // spectator
		packet.writeBoolean(false); // ignore ?
		packet.writeInt(0); // suspiciousUserIds
		packet.writeInt(-1678971475); // time left

		return packet;
	}

	sendPacket(packedID, packet) {
		this.clients.forEach((client) => {
			var _packet = new ByteArray(packet.buffer);
			client.sendPacket(packedID, _packet);
		});
	}

	updateToViewers(client) {
		this.viewers.forEach((_client) => {
			console.log("Atualizado para", _client.user.username);
			var packet = new ByteArray();

			packet.writeUTF(this.battleId);
			packet.writeInt(this.usersStat[client.user.username].kills);
			packet.writeInt(this.usersStat[client.user.username].score);
			packet.writeBoolean(this.usersStat[client.user.username].suspicious);
			packet.writeUTF(client.user.username);

			_client.sendPacket(-911626491, packet);
		});
	}

	addPlayer(client, team) {
		this.usersStat[client.user.username] = {
			deaths: 0,
			kills: 0,
			score: 0,
			suspicious: false,
			user: client.user.username,
		};
		if (team == 0) {
			this.teams.red.push(client.user.username);
		} else if (team == 1) {
			this.teams.blue.push(client.user.username);
		} else if (team == 2) {
			this.teams.dm.push(client.user.username);
		}
		this.updateToViewers(client);
		client.battle = this;
		client.lobby.addPlayerInBattle(client);
		if (!this.clients.includes(client)) {
			this.clients.push(client);
		}

		client.loadLayout(3);
		client.removeLobbyChat();
		client.removeBattleList();
		client.loadWeapons();
	}

	removePlayer(client) {
		if (this.clients.includes(client)) {
			this.clients = this.clients.filter(function (e) {
				return e !== client;
			});
			this.teams.red = this.teams.red.filter(function (e) {
				return e !== client.user.username;
			});
			this.teams.blue = this.teams.blue.filter(function (e) {
				return e !== client.user.username;
			});
			this.teams.dm = this.teams.dm.filter(function (e) {
				return e !== client.user.username;
			});
		}
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
