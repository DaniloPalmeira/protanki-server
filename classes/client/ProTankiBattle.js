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
			console.log(`O valor recebido não é uma string`);
		}
	}

	// FUNÇÕES SINCRONAS
	sendPacket(packetID, packet = new ByteArray()) {
		this.client.sendPacket(packetID, packet);
	}

	updateTankiData() {
		const tankiPacket = new ByteArray();
		tankiPacket.writeUTF(this.client.user.username);
		tankiPacket.writeFloat(this.equipament.hull.propers.HULL_SPEED.value); // maxSpeed
		tankiPacket.writeFloat(
			this.equipament.hull.propers.HULL_TURN_SPEED.value / 57.2957
		); // maxTurnSpeed
		tankiPacket.writeFloat(1.6999506950378418); // maxTurretRotationSpeed
		tankiPacket.writeFloat(
			this.equipament.hull.propers.HULL_ACCELERATION.value
		); // acceleration
		tankiPacket.writeShort(1); // specificationId
		this.sendPacket(-1672577397, tankiPacket);

		this.prepareCameraPosition();
	}

	prepareCameraPosition() {
		if (!this.isSpectator) {
			const spawnPoints = [
				{
					position: {
						x: -22763.44140625,
						y: 2887.464111328125,
						z: 200,
					},
					orientation: {
						x: 0,
						y: 0,
						z: 0,
					},
				},
			];

			const spawnPoint =
				spawnPoints[Math.floor(Math.random() * spawnPoints.length)];

			this.position = spawnPoint.position;
			this.orientation = spawnPoint.orientation;
			const tankiPOPacket = new ByteArray();
			tankiPOPacket.writeBoolean(false);
			tankiPOPacket.writeFloat(spawnPoint.position.x); // position - x
			tankiPOPacket.writeFloat(spawnPoint.position.y); // position - y
			tankiPOPacket.writeFloat(spawnPoint.position.z); // position - z
			tankiPOPacket.writeBoolean(false);
			tankiPOPacket.writeFloat(spawnPoint.orientation.x); // orientation - x
			tankiPOPacket.writeFloat(spawnPoint.orientation.y); // orientation - y
			tankiPOPacket.writeFloat(spawnPoint.orientation.z); // orientation - z
			this.sendPacket(-157204477, tankiPOPacket);
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
		const spectMsgPacket = new ByteArray();
		if (teamOnly) {
			message = `[${this.client.user.username}] → ${message}`;
		}
		spectMsgPacket.writeUTF(this.client.user.username);
		spectMsgPacket.writeUTF(message);
		// this.sendPacket(1532749363, spectMsgPacket);
		if (teamOnly) {
			this.party.sendPacketSpectator(1532749363, spectMsgPacket);
		} else {
			this.party.sendPacket(1532749363, spectMsgPacket);
		}
	}

	join(team = null) {
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
			packeta.writeBoolean(true); // suspeito
			packeta.writeUTF(this.client.user.username);
			if (this.party.modeStr == "DM") {
				this.client.lobbyServer.sendPacket(-911626491, packeta);
			} else {
				packeta.writeInt(this.team);
				this.client.lobbyServer.sendPacket(118447426, packeta);

				// ADICIONAR JOGADOR PARA OS OUTROS PLAYERS
				const myInfos = new ByteArray();
				myInfos.writeUTF(this.client.user.username);
				myInfos.writeBoolean(false);

				this.party.sendPacket(2040021062, myInfos, this.client);
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
			notifierDataPacket.writeUTF(this.client.user.username);
			this.sendPacket(-1895446889, notifierDataPacket);
		});

		this.client.resources.loadByJSON(
			{
				resources: [
					{
						idhigh: "0",
						idlow: 768697,
						versionhigh: "0",
						versionlow: 1,
						lazy: false,
						type: 8,
					},
					{
						idhigh: "0",
						idlow: 421539,
						versionhigh: "0",
						versionlow: 2,
						lazy: false,
						type: 8,
					},
					{
						idhigh: "0",
						idlow: 894006,
						versionhigh: "0",
						versionlow: 3,
						lazy: false,
						type: 8,
					},
					{
						idhigh: "0",
						idlow: 344680,
						versionhigh: "0",
						versionlow: 2,
						lazy: false,
						type: 8,
					},
					{
						idhigh: "0",
						idlow: 644412,
						versionhigh: "0",
						versionlow: 1,
						lazy: false,
						type: 8,
					},
					{
						idhigh: "0",
						idlow: 698047,
						versionhigh: "0",
						versionlow: 35,
						lazy: false,
						type: 8,
					},
					{
						idhigh: "0",
						idlow: 994853,
						versionhigh: "0",
						versionlow: 2,
						lazy: false,
						type: 8,
					},
					{
						idhigh: "0",
						idlow: 426360,
						versionhigh: "0",
						versionlow: 2,
						lazy: false,
						type: 8,
					},
					{
						idhigh: "0",
						idlow: 286895,
						versionhigh: "0",
						versionlow: 5,
						lazy: false,
						type: 8,
					},
					{
						idhigh: "0",
						idlow: 761948,
						versionhigh: "0",
						versionlow: 2,
						lazy: false,
						type: 8,
					},
				],
			},
			4
		);

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

	mapParams() {
		// map_zone
		const paramsMap = new ByteArray();
		const mapObject = {
			kick_period_ms: 300000,
			map_id: this.party.map,
			mapId: 684125,
			invisible_time: 3500,
			spectator: this.isSpectator,
			active: true,
			dustParticle: 110001,
			battleId: this.party.id,
			minRank: this.party.minRank,
			maxRank: this.party.maxRank,
			skybox: JSON.stringify({
				top: 45572,
				front: 57735,
				back: 268412,
				bottom: 31494,
				left: 927961,
				right: 987391,
			}),
			sound_id: 584396,
			map_graphic_data: JSON.stringify({
				mapId: this.party.map,
				mapTheme: this.party.themeStr,
				angleX: -1,
				angleZ: -0.5,
				lightColor: 13090219,
				shadowColor: 5530735,
				fogAlpha: 0.25,
				fogColor: 10543615,
				farLimit: 10000,
				nearLimit: 5000,
				gravity: this.party.gravity,
				skyboxRevolutionSpeed: 0,
				ssaoColor: 2045258,
				dustAlpha: 0.75,
				dustDensity: 0.15000000596046448,
				dustFarDistance: 7000,
				dustNearDistance: 5000,
				dustParticle: "summer",
				dustSize: 200,
			}),
			reArmorEnabled: this.party.reArmorEnabled,
			lighting: JSON.stringify({
				ctfLighting: {
					redColor: 16711680,
					redColorIntensity: 1,
					blueColor: 26367,
					blueColorIntensity: 1,
					attenuationBegin: 100,
					attenuationEnd: 1000,
				},
				dominationLighting: {
					redPointColor: 16711680,
					redPointIntensity: 1,
					bluePointColor: 26367,
					bluePointIntensity: 1,
					neutralPointColor: 16777215,
					neutralPointIntensity: 0.7,
					attenuationBegin: 100,
					attenuationEnd: 1000,
				},
			}),
		};
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

	table() {
		if (!this.isSpectator) {
			this.myTankInTable();
		}
	}

	myTankInTable() {
		this.party.clients.forEach((_client) => {
			const statsPacket = new ByteArray();
			statsPacket.writeInt(this.deaths); // deaths
			statsPacket.writeInt(this.kills); // kills
			statsPacket.writeInt(this.score); // score
			statsPacket.writeUTF(this.client.user.username); // user

			this.sendPacket(696140460, statsPacket);
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
		const { scoreBlue, scoreRed, usersBlue, usersRed } = this.party;
		statTeamPacket.writeInt(scoreBlue);
		statTeamPacket.writeInt(scoreRed);

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
		console.log(this.health);
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
		prepareTankiPacket.writeByte(0); // position
		prepareTankiPacket.writeFloat(this.position.x);
		prepareTankiPacket.writeFloat(this.position.y);
		prepareTankiPacket.writeFloat(this.position.z);
		prepareTankiPacket.writeByte(0); // orientation
		prepareTankiPacket.writeFloat(this.orientation.x);
		prepareTankiPacket.writeFloat(this.orientation.y);
		prepareTankiPacket.writeFloat(this.orientation.z);
		prepareTankiPacket.writeShort(this.health); // health
		prepareTankiPacket.writeShort(this.incarnation); // incarnationId
		this.party.sendPacket(875259457, prepareTankiPacket);
		this.state = "newcome";
		this.state_null = false;
	}

	movePacket() {
		const movementPacket = new ByteArray();
		movementPacket.writeBoolean(false); // angularVelocity
		movementPacket.writeFloat(this.angularVelocity.x); // x
		movementPacket.writeFloat(this.angularVelocity.y); // y
		movementPacket.writeFloat(this.angularVelocity.z); // z

		movementPacket.writeByte(this.control); // control

		movementPacket.writeBoolean(false); // linearVelocity
		movementPacket.writeFloat(this.linearVelocity.x); // x
		movementPacket.writeFloat(this.linearVelocity.y); // y
		movementPacket.writeFloat(this.linearVelocity.z); // z

		movementPacket.writeBoolean(false); // orientation
		movementPacket.writeFloat(this.orientation.x); // x
		movementPacket.writeFloat(this.orientation.y); // y
		movementPacket.writeFloat(this.orientation.z); // z

		movementPacket.writeBoolean(false); // position
		movementPacket.writeFloat(this.position.x); // x
		movementPacket.writeFloat(this.position.y); // y
		movementPacket.writeFloat(this.position.z); // z

		return movementPacket;
	}

	randInt(min, max) {
		// min and max included
		return Math.floor(Math.random() * (max - min + 1) + min);
	}

	damage(targetsUsers) {
		const damagePacket = new ByteArray();
		damagePacket.writeInt(targetsUsers.length);

		let damageList = {
			railgun: {
				0: this.randInt(68, 106),
				1: this.randInt(90, 137),
				2: this.randInt(111, 168),
				3: this.randInt(133, 199),
			},
		};

		const level = this.equipament.turret.m;
		const turretName = this.equipament.turret.id;
		const mainDamage = damageList[turretName]?.[level] ?? 0;

		targetsUsers.forEach((target) => {
			target.battle.health -= mainDamage * target.battle.healthPart;
			target.battle.updateHealth();
			damagePacket.writeFloat(mainDamage);
			if (target.battle.health <= 0) {
				damagePacket.writeInt(2);
				this.kill(target);
			} else {
				damagePacket.writeInt(0);
			}
			damagePacket.writeUTF(target.username);
		});
		this.client.sendPacket(-1165230470, damagePacket);
	}

	kill(killed) {
		let valueToIncreaseFund =
			killed.rank / 6 +
			killed.battle.equipament.hull.propers.HULL_ARMOR.value / 100;
		this.updateFund(valueToIncreaseFund);

		killed.battle.deaths++;
		killed.battle.state = "suicide";
		killed.battle.state_null = true;
		killed.battle.incarnation++;
		killed.battle.updateStat();

		this.kills += 1;
		this.updateStat();

		const packet = new ByteArray();
		packet.writeUTF(killed.username);
		packet.writeUTF(this.client.user.username);
		packet.writeInt(3000);
		this.party.sendPacket(-42520728, packet);
	}

	updateStat() {
		const statPacket = new ByteArray();
		const { deaths, kills } = this;
		console.log({ deaths, kills });
		statPacket.writeInt(this.deaths);
		statPacket.writeInt(this.kills);
		statPacket.writeInt(this.score);
		statPacket.writeUTF(this.client.user.username);
		statPacket.writeInt(this.team);
		this.party.sendPacket(-497293992, statPacket);
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
