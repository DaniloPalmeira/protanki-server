const Sequelize = require("sequelize");
const user = require("../helpers/database/user");
const { getUserByUsername, getFriendsOrCreateByID } = require("../helpers/db");

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
			green: { m: 0 },
			holiday: { m: 0 },
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
		await user.update(
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

	getDataByRank(rank) {
		let objData;
		if (rank == 1 || rank > 30) {
			objData = { currentRankScore: 0, nextRankScore: 100, bonusCrystals: 0 };
		} else if (rank == 2) {
			objData = {
				currentRankScore: 100,
				nextRankScore: 500,
				bonusCrystals: 10,
			};
		} else if (rank == 3) {
			objData = {
				currentRankScore: 500,
				nextRankScore: 1500,
				bonusCrystals: 40,
			};
		} else if (rank == 4) {
			objData = {
				currentRankScore: 1500,
				nextRankScore: 3700,
				bonusCrystals: 120,
			};
		} else if (rank == 5) {
			objData = {
				currentRankScore: 3700,
				nextRankScore: 7100,
				bonusCrystals: 230,
			};
		} else if (rank == 6) {
			objData = {
				currentRankScore: 7100,
				nextRankScore: 12300,
				bonusCrystals: 420,
			};
		} else if (rank == 7) {
			objData = {
				currentRankScore: 12300,
				nextRankScore: 20000,
				bonusCrystals: 740,
			};
		} else if (rank == 8) {
			objData = {
				currentRankScore: 20000,
				nextRankScore: 29000,
				bonusCrystals: 950,
			};
		} else if (rank == 9) {
			objData = {
				currentRankScore: 29000,
				nextRankScore: 41000,
				bonusCrystals: 1400,
			};
		} else if (rank == 10) {
			objData = {
				currentRankScore: 41000,
				nextRankScore: 57000,
				bonusCrystals: 2000,
			};
		} else if (rank == 11) {
			objData = {
				currentRankScore: 57000,
				nextRankScore: 76000,
				bonusCrystals: 2500,
			};
		} else if (rank == 12) {
			objData = {
				currentRankScore: 76000,
				nextRankScore: 98000,
				bonusCrystals: 3100,
			};
		} else if (rank == 13) {
			objData = {
				currentRankScore: 98000,
				nextRankScore: 125000,
				bonusCrystals: 3900,
			};
		} else if (rank == 14) {
			objData = {
				currentRankScore: 125000,
				nextRankScore: 156000,
				bonusCrystals: 4600,
			};
		} else if (rank == 15) {
			objData = {
				currentRankScore: 156000,
				nextRankScore: 192000,
				bonusCrystals: 5600,
			};
		} else if (rank == 16) {
			objData = {
				currentRankScore: 192000,
				nextRankScore: 233000,
				bonusCrystals: 6600,
			};
		} else if (rank == 17) {
			objData = {
				currentRankScore: 233000,
				nextRankScore: 280000,
				bonusCrystals: 7900,
			};
		} else if (rank == 18) {
			objData = {
				currentRankScore: 280000,
				nextRankScore: 332000,
				bonusCrystals: 8900,
			};
		} else if (rank == 19) {
			objData = {
				currentRankScore: 332000,
				nextRankScore: 390000,
				bonusCrystals: 10000,
			};
		} else if (rank == 20) {
			objData = {
				currentRankScore: 390000,
				nextRankScore: 455000,
				bonusCrystals: 12000,
			};
		} else if (rank == 21) {
			objData = {
				currentRankScore: 455000,
				nextRankScore: 527000,
				bonusCrystals: 14000,
			};
		} else if (rank == 22) {
			objData = {
				currentRankScore: 527000,
				nextRankScore: 606000,
				bonusCrystals: 16000,
			};
		} else if (rank == 23) {
			objData = {
				currentRankScore: 606000,
				nextRankScore: 692000,
				bonusCrystals: 17000,
			};
		} else if (rank == 24) {
			objData = {
				currentRankScore: 692000,
				nextRankScore: 787000,
				bonusCrystals: 20000,
			};
		} else if (rank == 25) {
			objData = {
				currentRankScore: 787000,
				nextRankScore: 889000,
				bonusCrystals: 22000,
			};
		} else if (rank == 26) {
			objData = {
				currentRankScore: 889000,
				nextRankScore: 1000000,
				bonusCrystals: 24000,
			};
		} else if (rank == 27) {
			objData = {
				currentRankScore: 1000000,
				nextRankScore: 1122000,
				bonusCrystals: 28000,
			};
		} else if (rank == 28) {
			objData = {
				currentRankScore: 1122000,
				nextRankScore: 1255000,
				bonusCrystals: 31000,
			};
		} else if (rank == 29) {
			objData = {
				currentRankScore: 1255000,
				nextRankScore: 1400000,
				bonusCrystals: 34000,
			};
		} else if (rank == 30) {
			objData = {
				currentRankScore: 1400000,
				nextRankScore: 0,
				bonusCrystals: 37000,
			};
		}
		return objData;
	}

	async updateProgress() {
		if (this.experience < 100) {
			this.rank = 1;
		} else if (this.experience < 500) {
			this.rank = 2;
		} else if (this.experience < 1500) {
			this.rank = 3;
		} else if (this.experience < 3700) {
			this.rank = 4;
		} else if (this.experience < 7100) {
			this.rank = 5;
		} else if (this.experience < 12300) {
			this.rank = 6;
		} else if (this.experience < 20000) {
			this.rank = 7;
		} else if (this.experience < 29000) {
			this.rank = 8;
		} else if (this.experience < 41000) {
			this.rank = 9;
		} else if (this.experience < 57000) {
			this.rank = 10;
		} else if (this.experience < 76000) {
			this.rank = 11;
		} else if (this.experience < 98000) {
			this.rank = 12;
		} else if (this.experience < 125000) {
			this.rank = 13;
		} else if (this.experience < 156000) {
			this.rank = 14;
		} else if (this.experience < 192000) {
			this.rank = 15;
		} else if (this.experience < 233000) {
			this.rank = 16;
		} else if (this.experience < 280000) {
			this.rank = 17;
		} else if (this.experience < 332000) {
			this.rank = 18;
		} else if (this.experience < 390000) {
			this.rank = 19;
		} else if (this.experience < 455000) {
			this.rank = 20;
		} else if (this.experience < 527000) {
			this.rank = 21;
		} else if (this.experience < 606000) {
			this.rank = 22;
		} else if (this.experience < 692000) {
			this.rank = 23;
		} else if (this.experience < 787000) {
			this.rank = 24;
		} else if (this.experience < 889000) {
			this.rank = 25;
		} else if (this.experience < 1000000) {
			this.rank = 26;
		} else if (this.experience < 1122000) {
			this.rank = 27;
		} else if (this.experience < 1255000) {
			this.rank = 28;
		} else if (this.experience < 1400000) {
			this.rank = 29;
		} else if (this.experience >= 1400000) {
			this.rank = 30;
		}

		Object.assign(this, this.getDataByRank(this.rank));
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
