const Sequelize = require("sequelize");
const user = require("../helpers/database/user");
const {
	getUserByUsername,
	getFriendsOrCreateByID,
	updateFriends,
} = require("../helpers/db");

module.exports = class ProTankiUser {
	exist = false;
	online = false;
	username = null;
	privLevel = 0;
	crystal = 0;
	experience = 0;
	spectator = 0;
	rank = 1;
	currentRankScore = 0;
	nextRankScore = 0;
	bonusCrystals = 0;
	IPAddress = "";
	propass = false;
	battle = null;
	garageBase = {
		weapon: {
			equiped: "smoky",
			smoky: { m: 0 },
		},
		armor: {
			equiped: "hunter",
			hunter: { m: 0 },
		},
		paint: {
			equiped: "green",
			green: {},
			holiday: {},
		},
		inventory: {},
	};

	constructor(client = undefined) {
		this.client = client;
		if (client != undefined) {
			this.profile = client.profile;
		}
	}

	async loadByUsername(username) {
		if (!username) {
			return;
		}
		var _user = await getUserByUsername(username);
		await this.load(_user);
	}

	async loadByUser(_user) {
		await this.load(_user);
	}

	async load(_user) {
		if (_user) {
			this.exist = true;
			Object.assign(this, _user);

			await this.updateProgress();
			if (this.garage == null) {
				this.garage = this.garageBase;
			} else {
				this.garage = JSON.parse(this.garage);
			}

			// GET FRIENDS
			this.friends = await getFriendsOrCreateByID(_user.uid);
		}
		return;
	}

	async updateGarage() {
		var infos = await user.update(
			{
				garage: JSON.stringify(this.garage),
				crystal: this.crystal,
			},
			{
				where: Sequelize.where(
					Sequelize.fn("lower", Sequelize.col("username")),
					Sequelize.fn("lower", this.username)
				),
			}
		);
	}

	async updateProgress() {
		if (this.experience < 100) {
			this.rank = 1;
			this.currentRankScore = 0;
			this.nextRankScore = 100;
			this.bonusCrystals = 0;
		} else if (this.experience < 500) {
			this.rank = 2;
			this.currentRankScore = 100;
			this.nextRankScore = 500;
			this.bonusCrystals = 10;
		} else if (this.experience < 1500) {
			this.rank = 3;
			this.currentRankScore = 500;
			this.nextRankScore = 1500;
			this.bonusCrystals = 40;
		} else if (this.experience < 3700) {
			this.rank = 4;
			this.currentRankScore = 1500;
			this.nextRankScore = 3700;
			this.bonusCrystals = 120;
		} else if (this.experience < 7100) {
			this.rank = 5;
			this.currentRankScore = 3700;
			this.nextRankScore = 7100;
			this.bonusCrystals = 230;
		} else if (this.experience < 12300) {
			this.rank = 6;
			this.currentRankScore = 7100;
			this.nextRankScore = 12300;
			this.bonusCrystals = 420;
		} else if (this.experience < 20000) {
			this.rank = 7;
			this.currentRankScore = 12300;
			this.nextRankScore = 20000;
			this.bonusCrystals = 740;
		} else if (this.experience < 29000) {
			this.rank = 8;
			this.currentRankScore = 20000;
			this.nextRankScore = 29000;
			this.bonusCrystals = 950;
		} else if (this.experience < 41000) {
			this.rank = 9;
			this.currentRankScore = 29000;
			this.nextRankScore = 41000;
			this.bonusCrystals = 1400;
		} else if (this.experience < 57000) {
			this.rank = 10;
			this.currentRankScore = 41000;
			this.nextRankScore = 57000;
			this.bonusCrystals = 2000;
		} else if (this.experience < 76000) {
			this.rank = 11;
			this.currentRankScore = 57000;
			this.nextRankScore = 76000;
			this.bonusCrystals = 2500;
		} else if (this.experience < 98000) {
			this.rank = 12;
			this.currentRankScore = 76000;
			this.nextRankScore = 98000;
			this.bonusCrystals = 3100;
		} else if (this.experience < 125000) {
			this.rank = 13;
			this.currentRankScore = 98000;
			this.nextRankScore = 125000;
			this.bonusCrystals = 3900;
		} else if (this.experience < 156000) {
			this.rank = 14;
			this.currentRankScore = 125000;
			this.nextRankScore = 156000;
			this.bonusCrystals = 4600;
		} else if (this.experience < 192000) {
			this.rank = 15;
			this.currentRankScore = 156000;
			this.nextRankScore = 192000;
			this.bonusCrystals = 5600;
		} else if (this.experience < 233000) {
			this.rank = 16;
			this.currentRankScore = 192000;
			this.nextRankScore = 233000;
			this.bonusCrystals = 6600;
		} else if (this.experience < 280000) {
			this.rank = 17;
			this.currentRankScore = 233000;
			this.nextRankScore = 280000;
			this.bonusCrystals = 7900;
		} else if (this.experience < 332000) {
			this.rank = 18;
			this.currentRankScore = 280000;
			this.nextRankScore = 332000;
			this.bonusCrystals = 8900;
		} else if (this.experience < 390000) {
			this.rank = 19;
			this.currentRankScore = 332000;
			this.nextRankScore = 390000;
			this.bonusCrystals = 10000;
		} else if (this.experience < 455000) {
			this.rank = 20;
			this.currentRankScore = 390000;
			this.nextRankScore = 455000;
			this.bonusCrystals = 12000;
		} else if (this.experience < 527000) {
			this.rank = 21;
			this.currentRankScore = 455000;
			this.nextRankScore = 527000;
			this.bonusCrystals = 14000;
		} else if (this.experience < 606000) {
			this.rank = 22;
			this.currentRankScore = 527000;
			this.nextRankScore = 606000;
			this.bonusCrystals = 16000;
		} else if (this.experience < 692000) {
			this.rank = 23;
			this.currentRankScore = 606000;
			this.nextRankScore = 692000;
			this.bonusCrystals = 17000;
		} else if (this.experience < 787000) {
			this.rank = 24;
			this.currentRankScore = 692000;
			this.nextRankScore = 787000;
			this.bonusCrystals = 20000;
		} else if (this.experience < 889000) {
			this.rank = 25;
			this.currentRankScore = 787000;
			this.nextRankScore = 889000;
			this.bonusCrystals = 22000;
		} else if (this.experience < 1000000) {
			this.rank = 26;
			this.currentRankScore = 889000;
			this.nextRankScore = 1000000;
			this.bonusCrystals = 24000;
		} else if (this.experience < 1122000) {
			this.rank = 27;
			this.currentRankScore = 1000000;
			this.nextRankScore = 1122000;
			this.bonusCrystals = 28000;
		} else if (this.experience < 1255000) {
			this.rank = 28;
			this.currentRankScore = 1122000;
			this.nextRankScore = 1255000;
			this.bonusCrystals = 31000;
		} else if (this.experience < 1400000) {
			this.rank = 29;
			this.currentRankScore = 1255000;
			this.nextRankScore = 1400000;
			this.bonusCrystals = 34000;
		} else if (this.experience >= 1400000) {
			this.rank = 30;
			this.currentRankScore = 1400000;
			this.nextRankScore = 0;
			this.bonusCrystals = 37000;
		}
		return;
	}

	get exist() {
		return this.exist;
	}

	get userStatus() {
		if (!this.exist) return null;
		return {
			chatModeratorLevel: this.privLevel,
			IP: this.IPAddress,
			rankIndex: this.rank,
			userID: this.username,
		};
	}
};
