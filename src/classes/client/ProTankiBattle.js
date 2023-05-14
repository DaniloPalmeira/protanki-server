const logger = require("../../helpers/logger");
const {
	userStatsPacket,
	tankiParamsPacket,
	cameraPacket,
	vectorPacket,
} = require("../../protocol/package");
const ByteArray = require("../ByteArray");

module.exports = class {
	score = 0;
	kills = 0;
	deaths = 0;
	incarnation = 0;

	health = 10000;
	healthPart = 1;
	healthTotal = 1;

	state = "newcome";
	state_null = true;

	team = 2;
	teamString = {
		0: "RED",
		1: "BLUE",
		2: "NONE",
	};

	position = { x: -22763.44140625, y: 2887.464111328125, z: 200 };
	orientation = { x: 0, y: 0, z: -6.2829999923706055 };
	angularVelocity = { x: 0, y: 0, z: 0 };
	linearVelocity = { x: 0, y: 0, z: 0 };

	control = 0;
	angle = 0;
	turretDirection = 0;

	isSpectator = false;

	ping = { count: 0, current: 0, total: 0 };

	constructor(client) {
		this.client = client;

		const { armor, weapon, paint } = this.client.user.garage;
		const paintProps = {
			...this.client.server.paintProperties[paint.equiped],
			id: paint.equiped,
		};

		this.equipament = {
			hull: {
				...this.client.server.armorProperties[armor.equiped][
					armor[armor.equiped].m.toString()
				],
				id: armor.equiped,
				m: armor[armor.equiped].m,
			},
			turret: {
				...this.client.server.weaponProperties[weapon.equiped][
					weapon[weapon.equiped].m.toString()
				],
				id: weapon.equiped,
				m: weapon[weapon.equiped].m,
			},
			paint: paintProps,
		};

		this.equipament.paint.resistances = this.resistancesTransform(
			this.equipament.paint.resistances
		);

		this.supplies = this.client.user.garage.inventory;

		this.healthTotal = this.equipament.hull.propers.HULL_ARMOR.value;
		this.healthPart = 10000 / this.healthTotal;

		this.party = client.user.selectedBattle;
		this.party.removeViewer(client);
	}

	get teamStr() {
		return this.teamString[this.team];
	}

	set teamStr(value) {
		if (typeof value === "string") {
			const index = Object.values(this.teamString).indexOf(this.team);
			this.team = index !== -1 ? index : 0;
		} else {
			this.team = 0;
			logger.info(`O valor recebido não é uma string`);
		}
	}

	// FUNÇÕES SINCRONAS
	sendPacket(packetID, packet = new ByteArray()) {
		this.client.sendPacket(packetID, packet);
	}

	sendPacketTeam(packetID, packet = new ByteArray()) {
		const users = [
			...this.party.userListByTeam[this.teamStr.toLowerCase()],
			...this.party.spectators.map((_client) => {
				return _client.user;
			}),
		];
		users.forEach((user) => {
			user.client.sendPacket(packetID, packet);
		});
	}

	putMine() {
		const mine = {};

		mine.id = (++this.party.bonusId).toString();
		mine.owner = this.client.user.username;
		mine.position = JSON.parse(JSON.stringify(this.position));

		const packet = new ByteArray();
		packet.writeUTF("mine");
		packet.writeInt(0);
		packet.writeBoolean(true);
		this.sendPacket(2032104949, packet);

		const minePacket = new ByteArray();
		minePacket.writeUTF(mine.id);
		minePacket.writeFloat(mine.position.x);
		minePacket.writeFloat(mine.position.y);
		minePacket.writeFloat(mine.position.z);
		minePacket.writeUTF(mine.owner);
		this.party.sendPacket(272183855, minePacket);

		setTimeout(() => {
			this.party.mines.push(mine);
			const _mineNamePacket = new ByteArray();
			_mineNamePacket.writeUTF(mine.id);
			this.party.sendPacket(-624217047, _mineNamePacket);
		}, 3000);
	}

	tryMineAction() {
		const mines = this.party.mines;
		const username = this.client.user.username;

		for (let i = mines.length - 1; i >= 0; i--) {
			const mine = mines[i];
			const distanceOfMine = this.calculateDistance(mine.position);

			if (distanceOfMine < 383 && mine.owner != username) {
				// this.client.command.replySystem(distanceOfMine.toString());
				// Verifica se o elemento ainda está na lista
				if (mines.includes(mine)) {
					mines.splice(i, 1);
					const packet = new ByteArray();
					packet.writeUTF(mine.id);
					packet.writeUTF(username);
					this.party.sendPacket(1387974401, packet);

					// Remove o elemento da lista de minas
				}
			}
		}
	}

	resistancesTransform(obj) {
		const newObj = {};
		for (let prop in obj) {
			const newProp = prop.toLowerCase().split("_")[0];
			newObj[newProp] = obj[prop];
			delete obj[prop];
		}
		return newObj;
	}

	updateTankiData() {
		const packet = new ByteArray(tankiParamsPacket(this.client.user));
		this.sendPacket(-1672577397, packet);

		this.prepareCameraPosition();
	}

	prepareCameraPosition() {
		if (!this.isSpectator) {
			const spawnPoints = this.party.spawns[this.teamStr];

			const spawnPoint =
				spawnPoints[Math.floor(Math.random() * spawnPoints.length)];

			this.position = spawnPoint.position;
			this.orientation = spawnPoint.orientation;

			const packet = new ByteArray(
				cameraPacket(this.position, this.orientation)
			);

			this.sendPacket(-157204477, packet);
		}
	}

	weaponsInfos() {
		var packet = new ByteArray();

		packet.writeObject(this.client.server.weapons);

		this.sendPacket(-2124388778, packet);
	}

	joinSpectator() {
		this.isSpectator = true;
		this.party.spectators.push(this.client);
		this.join();
	}

	spectatorMessage(message, teamOnly) {
		const packet = new ByteArray();
		if (teamOnly) {
			message = `[${this.client.user.username}] → ${message}`;
		}
		packet.writeUTF(this.client.user.username);
		packet.writeUTF(message);
		// this.sendPacket(1532749363, packet);
		if (teamOnly) {
			this.party.sendPacketSpectator(1532749363, packet);
		} else {
			this.party.sendPacket(1532749363, packet);
		}
	}

	join(team = null) {
		if (this.party.mapInfos === null || this.party.mapLibrary === null) {
			this.client.user.battle = null;
			return;
		}
		const { turret, hull } = this.equipament;
		const validEquipment = this.party.validEquips[this.party.equip];
		if (
			!this.isSpectator &&
			validEquipment &&
			(!validEquipment.turret.includes(turret.id.replace("_xt", "")) ||
				!validEquipment.hull.includes(hull.id.replace("_xt", "")))
		) {
			this.client.user.battle = null;
			const packet = new ByteArray();
			packet.writeUTF(this.party.id);
			this.sendPacket(1229594925, packet);
			return;
		}
		if (team !== null) {
			this.team = team;
			if (team == 0) {
				this.party.usersRed.push(this.client.user);
			} else if (team == 1) {
				this.party.usersBlue.push(this.client.user);
			} else if (team == 2) {
				this.party.users.push(this.client.user);
			}
		}
		if (!this.isSpectator) {
			this.party.clients.push(this.client);

			const packetb = new ByteArray();
			packetb.writeUTF(this.party.id);

			this.client.lobbyServer.sendPacket(-344514517, packetb);

			packetb.writeUTF(this.client.user.username);
			if (this.party.modeStr == "DM") {
				this.client.lobbyServer.sendPacket(-2133657895, packetb);
			} else {
				packetb.writeInt(this.team);
				this.client.lobbyServer.sendPacket(-169305322, packetb);
			}

			const packeta = new ByteArray();
			packeta.writeUTF(this.party.id);
			packeta.writeInt(this.kills);
			packeta.writeInt(this.score);
			packeta.writeBoolean(false); // suspeito
			packeta.writeUTF(this.client.user.username);
			if (this.party.modeStr == "DM") {
				this.client.lobbyServer.sendPacket(-911626491, packeta);
			} else {
				packeta.writeInt(this.team);
				this.client.lobbyServer.sendPacket(118447426, packeta);
			}
		}

		this.client.loadLayout({ layout: 3 });
		this.client.lobby.removeBattleList();
		this.client.lobby.removeChat();
		this.weaponsInfos();

		this.userPlayingInfos();

		const notifierDataPacketBase = new ByteArray();
		notifierDataPacketBase.writeUTF(this.party.id);
		notifierDataPacketBase.writeUTF(this.party.name);
		notifierDataPacketBase.writeInt(this.party.modeInt);
		notifierDataPacketBase.writeBoolean(this.party.private);
		notifierDataPacketBase.writeBoolean(this.party.pro);
		notifierDataPacketBase.writeInt(this.party.maxRank);
		notifierDataPacketBase.writeInt(this.party.minRank);
		notifierDataPacketBase.writeInt(this.client.server.id);
		this.party.clients.forEach((_client) => {
			const notifierDataPacket = new ByteArray();
			notifierDataPacket.write(notifierDataPacketBase.buffer);
			notifierDataPacket.writeUTF(_client.user.username);
			this.sendPacket(-1895446889, notifierDataPacket);
		});

		this.loadLibraryResources();

		this.sendPacket(-555602629);

		const doubleInt = new ByteArray();
		doubleInt.writeInt(0);
		doubleInt.writeInt(0);
		this.sendPacket(34068208, doubleInt);
	}

	bonusesParams() {
		const paramsBonus = new ByteArray();
		paramsBonus.writeObject({
			bonuses: [
				{ id: "nitro", resourceId: 170010, lifeTimeMs: 30000 },
				{ id: "damage", resourceId: 170011, lifeTimeMs: 30000 },
				{ id: "armor", resourceId: 170006, lifeTimeMs: 30000 },
				{ id: "health", resourceId: 170009, lifeTimeMs: 30000 },
				{ id: "crystall", resourceId: 170007, lifeTimeMs: 900000 },
				{ id: "gold", resourceId: 170008, lifeTimeMs: 30000000 },
				{ id: "special", resourceId: 170012, lifeTimeMs: 30000000 },
				{ id: "moon", resourceId: 170013, lifeTimeMs: 30000000 },
				{ id: "pumpkin", resourceId: 170014, lifeTimeMs: 30000000 },
			],
			cordResource: 1000065,
			parachuteInnerResource: 170005,
			parachuteResource: 170004,
			pickupSoundResource: 269321,
		});
		this.sendPacket(228171466, paramsBonus);
	}

	loadSkyboxResources() {
		const resources = Object.values(this.party.params.skybox).map(
			(value) => value
		);
		this.client.resources.loadByListOfIds(resources, 5);
	}

	loadMapResources() {
		this.client.resources.loadByListOfIds([this.party.mapInfos.mapId], 6);
	}

	loadLibraryResources() {
		this.client.resources.loadByListOfIds(this.party.params.resources, 4);
	}

	mapParams() {
		// map_zone
		const paramsMap = new ByteArray();
		const mapObject = JSON.parse(JSON.stringify(this.party.mapInfos));
		mapObject.spectator = this.isSpectator;

		mapObject.skybox = JSON.stringify(mapObject.skybox);
		mapObject.map_graphic_data = JSON.stringify(mapObject.map_graphic_data);
		mapObject.lighting = JSON.stringify(mapObject.lighting);
		paramsMap.writeObject(mapObject);

		this.sendPacket(-152638117, paramsMap);
	}

	effects() {
		const effectsPacket = new ByteArray();
		effectsPacket.writeObject(this.party.effects);
		this.sendPacket(417965410, effectsPacket);
	}

	objetoIndefinido() {
		const slaPacket = new ByteArray();
		slaPacket.writeObject([]);
		this.sendPacket(870278784, slaPacket);
	}

	StatisticsModel() {
		const SMPacket = new ByteArray();
		SMPacket.writeInt(this.party.modeInt);
		SMPacket.writeInt(this.party.equipInt);
		SMPacket.writeInt(this.party.fund);
		SMPacket.writeInt(this.party.scoreLimit);
		SMPacket.writeInt(this.party.timeLimitInSec);
		SMPacket.writeUTF(this.party.name);
		SMPacket.writeInt(this.party.maxPeople);
		SMPacket.writeBoolean(this.party.parkour);
		SMPacket.writeInt(100); // PORCENTAGEM RECEBIDA PELO PREMIUM
		SMPacket.writeBoolean(this.isSpectator); // ESPECTADOR
		SMPacket.writeInt(0); // LISTA DE PESSOAS SUSPEITAS
		let time = 0;
		let sobra = 0;
		if (this.party.timeLimitInSec > 256) {
			time = (this.party.timeLimitInSec - sobra) / 256;
			sobra = this.party.timeLimitInSec % 256;
		} else {
			sobra = this.party.timeLimitInSec;
		}
		if (sobra > 128) {
			sobra = sobra - 256;
		}
		SMPacket.writeInt(time); // TEMPO PARA ACABAR
		SMPacket.writeByte(sobra); // valuableRound

		this.sendPacket(522993449, SMPacket);
	}

	CodecBattleMineCC() {
		const MinePacket = new ByteArray(
			Buffer.from(
				"0005efc1000003e800000000000e1dd1000ebcff000ee269000eaebd0002ae20412000000007fd70000851ed40400000000ebc6940a00000000daab740e000003f00000000053a6d",
				"hex"
			)
		);
		this.sendPacket(-226978906, MinePacket);
	}

	suppliesPanel() {
		if (this.isSpectator || this.party.withoutSupplies) {
			return;
		}
		const suppliesPacket = new ByteArray();
		suppliesPacket.writeObject({
			items: [
				{
					id: "health",
					count: this.supplies?.health?.count ?? 0,
					slotId: 1,
					itemEffectTime: 0,
					itemRestSec: 30,
				},
				{
					id: "armor",
					count: this.supplies?.armor?.count ?? 0,
					slotId: 2,
					itemEffectTime: 60,
					itemRestSec: 15,
				},
				{
					id: "double_damage",
					count: this.supplies?.double_damage?.count ?? 0,
					slotId: 3,
					itemEffectTime: 60,
					itemRestSec: 15,
				},
				{
					id: "n2o",
					count: this.supplies?.n2o?.count ?? 0,
					slotId: 4,
					itemEffectTime: 60,
					itemRestSec: 15,
				},
				{
					id: "mine",
					count: this.supplies?.mine?.count ?? 0,
					slotId: 5,
					itemEffectTime: 0,
					itemRestSec: 30,
				},
			],
		});
		this.sendPacket(-137249251, suppliesPacket);
	}

	buildTankPacket(client) {
		const { user } = client;
		const { battle } = user;
		const { hull, turret, paint } = battle.equipament;

		const tankPacket = new ByteArray();
		const tankiInfos = {
			battleId: this.party.id,
			colormap_id: paint.coloring,
			hull_id: `${hull.id}_m${hull.m}`,
			turret_id: `${turret.id}_m${turret.m}`,
			team_type: battle.teamStr,
			partsObject: JSON.stringify({
				engineIdleSound: 386284,
				engineStartMovingSound: 226985,
				engineMovingSound: 75329,
				turretSound: 242699,
			}),
			hullResource: hull.object3ds,
			turretResource: turret.object3ds,
			sfxData: JSON.stringify(turret.sfxData || {}),
			position: battle.position,
			orientation: battle.orientation,
			incarnation: battle.incarnation,
			tank_id: user.username,
			nickname: user.username,
			state: battle.state,
			maxSpeed: hull.propers.HULL_SPEED.value,
			maxTurnSpeed: hull.propers.HULL_TURN_SPEED.value / 57.2957,
			acceleration: hull.propers.HULL_ACCELERATION.value,
			reverseAcceleration: 17,
			sideAcceleration: 24,
			turnAcceleration: 3.4906585,
			reverseTurnAcceleration: 6.4577184,
			mass: hull.propers.HULL_MASS.value,
			power: hull.propers.HULL_ACCELERATION.value,
			dampingCoeff: 900,
			turret_turn_speed: 1.6999506914424771,
			health: battle.health,
			rank: user.rank,
			kickback: 3,
			turretTurnAcceleration: 1.7599900177110819,
			impact_force: 7,
			state_null: battle.state_null,
		};
		tankPacket.writeObject(tankiInfos);
		return tankPacket;
	}

	newTank() {
		this.party.clients.forEach((_client) => {
			const tankPacket = this.buildTankPacket(_client);
			if (this.client == _client) {
				this.party.sendPacket(-1643824092, tankPacket);
			} else {
				this.sendPacket(-1643824092, tankPacket);
			}
		});
	}

	CodecStatistics() {
		if (this.party.modeStr === "DM") {
			this.CodecStatisticsDMCC();
		} else {
			this.CodecStatisticsTeamCC();
		}
	}

	CodecUserInfo(user) {
		const userInfoPacket = new ByteArray();
		userInfoPacket.writeInt(user.privLevel); // mod level
		userInfoPacket.writeInt(user.battle.deaths); // deahts
		userInfoPacket.writeInt(user.battle.kills); // kills
		userInfoPacket.writeByte(user.rank); // rank
		userInfoPacket.writeInt(user.battle.score); // score
		userInfoPacket.writeUTF(user.username); // uid
		return userInfoPacket.buffer;
	}

	CodecStatisticsDMCC() {
		const statDMPacket = new ByteArray();
		statDMPacket.writeInt(this.party.users.length);

		this.party.users.forEach((user) => {
			statDMPacket.write(this.CodecUserInfo(user));
		});

		this.sendPacket(-1959138292, statDMPacket);
	}

	CodecStatisticsTeamCC() {
		const statTeamPacket = new ByteArray();
		const { score, usersBlue, usersRed } = this.party;
		statTeamPacket.writeInt(score["blue"] ?? 0);
		statTeamPacket.writeInt(score["red"] ?? 0);

		statTeamPacket.writeInt(usersBlue.length);
		usersBlue.forEach((user) => {
			statTeamPacket.write(this.CodecUserInfo(user));
		});

		statTeamPacket.writeInt(usersRed.length);
		usersRed.forEach((user) => {
			statTeamPacket.write(this.CodecUserInfo(user));
		});

		this.sendPacket(-1233891872, statTeamPacket);
	}

	tryFlagAction() {
		if (this.state !== "active" || this.party.mode !== 2) {
			return;
		}
		this.tryTakeFlag();
		this.tryCaptureFlag();
		this.tryReturnFlag();
	}

	tryTakeFlag() {
		const party = this.party;
		const ctf = party.ctf;
		const enemyTeamName = this.team === 1 ? "red" : "blue";
		const { flag, base, lastAction, holder } = ctf[enemyTeamName];
		const now = new Date();

		if (holder || (lastAction && now - lastAction < 3000)) {
			return;
		}

		const flagPosition = flag.x ? flag : base;
		const distance = this.calculateDistance(flagPosition);

		if (distance > 300) {
			return;
		}
		ctf[enemyTeamName].holder = this.client.user.username;
		ctf[enemyTeamName].lastAction = now;

		const packet = new ByteArray()
			.writeUTF(this.client.user.username)
			.writeInt(this.team === 1 ? 0 : 1);

		this.party.sendPacket(-1282406496, packet);
		const scoreByCap = this.party.userListByTeam[enemyTeamName].length * 10;
		this.score += scoreByCap;
	}

	dropFlag() {
		const party = this.party;
		const ctf = party.ctf;
		const enemyTeamName = this.team === 1 ? "red" : "blue";
		const { ...flag } = this.position;
		flag.z -= 80;

		if (ctf[enemyTeamName].holder !== this.client.user.username) {
			return;
		}

		ctf[enemyTeamName].lastAction = new Date();
		ctf[enemyTeamName].holder = null;
		ctf[enemyTeamName].flag = flag;

		const packet = new ByteArray(vectorPacket(flag));
		packet.writeInt(this.team === 1 ? 0 : 1);

		this.party.sendPacket(1925237062, packet);
	}

	tryCaptureFlag() {
		const party = this.party;
		const ctf = party.ctf;
		const myTeam = this.team == 0 ? "red" : "blue";
		const enemyTeam = this.team == 1 ? "red" : "blue";
		const { holder, flag, base } = ctf[myTeam];

		if (
			holder ||
			flag.x ||
			ctf[enemyTeam].holder !== this.client.user.username
		) {
			return;
		}

		const distance = this.calculateDistance(base);
		if (distance > 300) {
			return;
		}

		const packet = new ByteArray()
			.writeInt(this.team)
			.writeUTF(this.client.user.username);

		this.party.sendPacket(-1870108387, packet);

		ctf[enemyTeam].holder = null;
		ctf[enemyTeam].flag = {};
		this.increaseTeamScore(1);
	}

	increaseTeamScore(amount) {
		const party = this.party;
		const teamName = this.teamStr.toLowerCase();
		if (party.score[teamName]) {
			party.score[teamName] += amount;
		} else {
			party.score[teamName] = amount;
		}
		this.party.sendPacket(
			561771020,
			new ByteArray().writeInt(this.team).writeInt(party.score[teamName] ?? 0)
		);

		if (party.scoreLimit && party.score[teamName] >= party.scoreLimit) {
			party.finish();
		}
	}

	tryReturnFlag() {
		const party = this.party;
		const ctf = party.ctf;
		const myTeam = this.team == 0 ? "red" : "blue";
		const enemyTeam = this.team == 1 ? "red" : "blue";
		const { holder, flag } = ctf[myTeam];

		if (party.mode !== 2 || holder || !flag.x) {
			return;
		}

		const distance = this.calculateDistance(flag);
		if (distance > 300) {
			return;
		}

		// const packet = new ByteArray()
		// 	.writeInt(this.team)
		// 	.writeUTF(this.client.user.username);

		// this.sendPacket(-1870108387, packet);

		ctf[myTeam].holder = null;
		ctf[myTeam].flag = {};

		const packet = new ByteArray();
		packet.writeInt(this.team);
		packet.writeUTF(this.client.user.username);
		this.party.sendPacket(-1026428589, packet);
	}

	/**
	 * Envia as informações dos jogadores da equipe do cliente para a rede.
	 */
	userPlayingInfos() {
		// Cria um objeto ByteArray para armazenar os dados dos usuários.
		const userByteData = new ByteArray();

		// Adiciona o nome do usuário cliente ao início do objeto ByteArray.
		userByteData.writeUTF(this.client.user.username);

		// Obtém a lista de usuários com base no valor da variável `team`.
		let usersList;
		switch (this.team) {
			case 0:
				usersList = this.party.usersRed;
				break;
			case 1:
				usersList = this.party.usersBlue;
				break;
			default:
				usersList = this.party.users;
				break;
		}

		// Adiciona o número total de usuários ao objeto ByteArray.
		userByteData.writeInt(usersList.length);

		// Adiciona as informações de cada usuário ao objeto ByteArray.
		usersList.forEach((user) => {
			userByteData.write(this.CodecUserInfo(user));
		});

		// Envia os dados dos usuários para a equipe correspondente.
		if (this.team === 2) {
			this.party.sendPacket(862913394, userByteData, this.client);
		} else {
			// Adiciona o número da equipe ao objeto ByteArray antes de enviá-lo.
			userByteData.writeInt(this.team);
			this.party.sendPacket(2040021062, userByteData, this.client);
		}
	}

	updateHealth() {
		const userHealthPacket = new ByteArray();
		userHealthPacket.writeUTF(this.client.user.username);
		userHealthPacket.writeFloat(this.health);
		this.party.sendPacket(-611961116, userHealthPacket);
	}

	spawn() {
		this.health = 10000;
		this.updateHealth();
		const prepareTankiPacket = new ByteArray();
		prepareTankiPacket.writeUTF(this.client.user.username); // nome
		prepareTankiPacket.writeInt(this.team); // team
		prepareTankiPacket.writePacket(vectorPacket(this.position));
		prepareTankiPacket.writePacket(vectorPacket(this.orientation));
		prepareTankiPacket.writeShort(this.health); // health
		prepareTankiPacket.writeShort(this.incarnation); // incarnationId
		this.party.sendPacket(875259457, prepareTankiPacket);
		this.state = "newcome";
		this.state_null = false;
	}

	movePacket() {
		const movementPacket = new ByteArray();
		movementPacket.writePacket(vectorPacket(this.angularVelocity));

		movementPacket.writeByte(this.control); // control

		movementPacket.writePacket(vectorPacket(this.linearVelocity));

		movementPacket.writePacket(vectorPacket(this.orientation));

		movementPacket.writePacket(vectorPacket(this.position));

		return movementPacket;
	}

	selfDestruct() {
		const incarnation = this.incarnation;

		setTimeout(() => {
			this.confirmSelfDestruct(incarnation);
		}, 10 * 1000);
	}

	confirmSelfDestruct(incarnation) {
		if (incarnation !== this.incarnation || this.client.user.battle !== this) {
			return;
		}
		this.incarnation++;
		this.state = "suicide";
		this.state_null = true;
		this.dropFlag();

		const packet = new ByteArray();
		packet.writeUTF(this.client.user.username);
		packet.writeInt(3000);
		this.party.sendPacket(162656882, packet);
	}

	randInt(min, max) {
		// min and max included
		return Math.floor(Math.random() * (max - min + 1) + min);
	}

	damage(targetsUsers, incarnations) {
		const damagePacket = new ByteArray();

		const damageList = {
			railgun: {
				0: this.randInt(68, 106),
				1: this.randInt(90, 137),
				2: this.randInt(111, 168),
				3: this.randInt(133, 199),
			},
			railgun_xt: {
				0: this.randInt(68, 106),
				1: this.randInt(90, 137),
				2: this.randInt(111, 168),
				3: this.randInt(133, 199),
			},
		};

		const level = this.equipament.turret.m;
		const turretName = this.equipament.turret.id.replace("_xt", "");
		const mainDamage = damageList[turretName]?.[level] ?? 0;

		const damageListPacket = new ByteArray();
		let damageListPacketCount = 0;

		for (const [index, target] of targetsUsers.entries()) {
			const protection =
				this.party.equip === 0
					? target.battle.equipament.paint.resistances[turretName]?.value ?? 0
					: 15;
			let userDamage = mainDamage * (1 - protection / 100);
			if (
				this.party.equip !== 0 &&
				(userDamage >= target.battle.healthTotal ||
					userDamage < target.battle.healthTotal / 2)
			) {
				if (userDamage >= target.battle.healthTotal) {
					userDamage = target.battle.healthTotal - 10;
				} else {
					userDamage = target.battle.healthTotal / 2 + 1;
				}
			}
			const incarnation = parseInt(incarnations[index]);
			if (
				(target.battle.team === this.team &&
					this.party.mode !== 0 &&
					!this.party.friendlyFire) ||
				target.battle.incarnation !== incarnation
			) {
				continue;
			}
			damageListPacketCount++;
			target.battle.health -= userDamage * target.battle.healthPart;
			target.battle.updateHealth();
			damageListPacket.writeFloat(userDamage);
			if (target.battle.health <= 0) {
				damageListPacket.writeInt(2);
				this.kill(target, incarnation);
			} else {
				damageListPacket.writeInt(0);
			}
			damageListPacket.writeUTF(target.username);
		}

		damagePacket.writeInt(damageListPacketCount);
		damagePacket.write(damageListPacket.buffer);

		this.client.sendPacket(-1165230470, damagePacket);
	}

	kill(killed, incarnation) {
		if (killed.battle.incarnation !== incarnation) {
			return;
		}
		killed.battle.incarnation++;
		let valueToIncreaseFund =
			killed.rank / 6 +
			killed.battle.equipament.hull.propers.HULL_ARMOR.value / 100;
		this.updateFund(valueToIncreaseFund);

		killed.battle.deaths++;
		killed.battle.state = "suicide";
		killed.battle.state_null = true;
		killed.battle.updateStat();
		killed.battle.dropFlag();

		this.kills += 1;
		this.score += 10;
		this.updateStat();

		const packet = new ByteArray();
		packet.writeUTF(killed.username);
		packet.writeUTF(this.client.user.username);
		packet.writeInt(3000);
		this.party.sendPacket(-42520728, packet);
		if (this.party.mode === 0) {
			if (this.party.scoreLimit && this.kills >= this.party.scoreLimit) {
				this.party.finish();
			}
		} else if (this.party.mode === 1) {
			this.increaseTeamScore(1);
		}
	}

	leave(layout = null) {
		this.dropFlag();
		this.sendPacket(-985579124); // REMOVER TELA DA BATALHA
		if (this.client.layout.front == 0) {
			this.client.lobby.removeBattleList();
		}
		this.party.removePlayer(this.client);
		const usernamePacket = new ByteArray();
		usernamePacket.writeUTF(this.client.user.username);
		this.party.sendPacket(1719707347, usernamePacket);
		if (this.party.mode == 0) {
			this.party.sendPacket(-1689876764, usernamePacket);
		} else {
			this.party.sendPacket(1411656080, usernamePacket);
		}
		if (layout !== null) {
			this.client.loadLayout({ layout, chat: true });
		}
	}

	resetUserStat() {
		this.kills = 0;
		this.score = 0;
		this.deaths = 0;
	}

	updateStat() {
		const packet = new ByteArray(userStatsPacket(this.client.user));
		if (this.party.mode !== 0) {
			packet.writeInt(this.team);
			this.party.sendPacket(-497293992, packet);
		} else {
			this.party.sendPacket(696140460, packet);
		}
	}

	updateFund(increase) {
		this.party.fund += increase;
		const fundPacket = new ByteArray();
		fundPacket.writeInt(Math.floor(this.party.fund));
		this.party.sendPacket(1149211509, fundPacket);
	}

	enableTanki() {
		const tankiPacket = new ByteArray();
		this.state = "active";
		tankiPacket.writeUTF(this.client.user.username);
		this.party.sendPacket(1868573511, tankiPacket);
	}

	calculateDistance(otherPoint = {}) {
		otherPoint = otherPoint || {};

		const { x: x1, y: y1, z: z1 } = this.position;
		const { x: x2 = 0, y: y2 = 0, z: z2 = 0 } = otherPoint;

		const distance = Math.sqrt(
			Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2)
		);

		return distance;
	}
};
