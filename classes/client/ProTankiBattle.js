const ByteArray = require("../ByteArray");
const { getUserById } = require("../../helpers/db");

module.exports = class {
	score = 0;
	kills = 0;
	deaths = 0;
	incarnation = 0;
	health = 10000;
	state = "suicide";
	constructor(client) {
		this.client = client;
		this.party = client.user.selectedBattle;
		this.party.removeViewer(client);
	}

	// FUNÇÕES SINCRONAS
	sendPacket(packetID, packet = new ByteArray()) {
		this.client.sendPacket(packetID, packet);
	}

	weaponsInfos() {
		var packet = new ByteArray();

		packet.writeObject(this.client.server.weapons);

		this.sendPacket(-2124388778, packet);
	}

	joinSpectator() {
		this.client.user.inSpect = true;
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

	join() {
		if (!this.client.user.inSpect) {
			this.party.clients.push(this.client);
		}
		this.client.loadLayout(3);
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
			spectator: this.client.user.inSpect,
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
				gravity: 1000,
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
		console.log(mapObject);
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
		SMPacket.writeBoolean(this.client.user.inSpect); // ESPECTADOR
		SMPacket.writeInt(0); // LISTA DE PESSOAS SUSPEITAS
		SMPacket.writeInt(10000); // TEMPO PARA ACABAR
		SMPacket.writeByte(9); // valuableRound

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
		if (this.client.user.inSpect) {
			return;
		}
		const suppliesPacket = new ByteArray();
		suppliesPacket.writeObject({
			items: [
				{
					id: "health",
					count: 2218,
					slotId: 1,
					itemEffectTime: 0,
					itemRestSec: 30,
				},
				{
					id: "armor",
					count: 2587,
					slotId: 2,
					itemEffectTime: 60,
					itemRestSec: 15,
				},
				{
					id: "double_damage",
					count: 2714,
					slotId: 3,
					itemEffectTime: 60,
					itemRestSec: 15,
				},
				{
					id: "n2o",
					count: 2626,
					slotId: 4,
					itemEffectTime: 60,
					itemRestSec: 15,
				},
				{ id: "mine", count: 0, slotId: 5, itemEffectTime: 0, itemRestSec: 30 },
			],
		});
		this.sendPacket(-137249251, suppliesPacket);
	}

	newTank() {
		this.party.clients.forEach((_client) => {
			const tankPacket = new ByteArray();
			tankPacket.writeObject({
				battleId: this.party.id,
				colormap_id: 412123,
				hull_id: "wasp_m3",
				turret_id: "railgun_m3",
				team_type: "NONE",
				partsObject:
					'{"engineIdleSound":386284,"engineStartMovingSound":226985,"engineMovingSound":75329,"turretSound":242699}',
				hullResource: 20647,
				turretResource: 839339,
				sfxData:
					'{"chargingPart1":114424,"chargingPart2":468379,"chargingPart3":932241,"hitMarkTexture":670581,"powTexture":963502,"ringsTexture":966691,"shotSound":900596,"smokeImage":882103,"sphereTexture":212409,"trailImage":550305,"lighting":[{"name":"charge","light":[{"attenuationBegin":200,"attenuationEnd":200,"color":16765017,"intensity":0.7,"time":0},{"attenuationBegin":200,"attenuationEnd":800,"color":16765017,"intensity":0.3,"time":600}]},{"name":"shot","light":[{"attenuationBegin":100,"attenuationEnd":600,"color":16765017,"intensity":0.7,"time":0},{"attenuationBegin":1,"attenuationEnd":2,"color":16765017,"intensity":0,"time":300}]},{"name":"hit","light":[{"attenuationBegin":200,"attenuationEnd":600,"color":16765017,"intensity":0.7,"time":0},{"attenuationBegin":1,"attenuationEnd":2,"color":16765017,"intensity":0,"time":300}]},{"name":"rail","light":[{"attenuationBegin":100,"attenuationEnd":500,"color":16765017,"intensity":0.5,"time":0},{"attenuationBegin":1,"attenuationEnd":2,"color":16765017,"intensity":0,"time":1800}]}],"bcsh":[{"brightness":9.027,"contrast":-3.54,"saturation":44.248,"hue":208.67,"key":"trail"},{"brightness":9.027,"contrast":-3.54,"saturation":44.248,"hue":208.67,"key":"charge"}]}',
				position: { x: 0, y: 0, z: 0 },
				orientation: { x: 0, y: 0, z: 0 },
				incarnation: _client.user.battle.incarnation,
				tank_id: _client.user.username,
				nickname: _client.user.username,
				state: _client.user.battle.state,
				maxSpeed: 13,
				maxTurnSpeed: 2.6179938,
				acceleration: 13,
				reverseAcceleration: 17,
				sideAcceleration: 24,
				turnAcceleration: 3.4906585,
				reverseTurnAcceleration: 6.4577184,
				mass: 2200,
				power: 13,
				dampingCoeff: 900,
				turret_turn_speed: 1.6999506914424771,
				health: 0,
				rank: _client.user.rank,
				kickback: 3,
				turretTurnAcceleration: 1.7599900177110819,
				impact_force: 7,
				state_null: true,
			});
			if (this.client == _client) {
				this.party.sendPacket(-1643824092, tankPacket);
			} else {
				this.sendPacket(-1643824092, tankPacket);
			}
		});
	}

	table() {
		if (!this.client.user.inSpect) {
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

	CodecStatisticsDMCC() {
		const statDMPacket = new ByteArray();
		statDMPacket.writeInt(this.party.clients.length);

		this.party.clients.forEach((_client) => {
			statDMPacket.writeInt(_client.user.privLevel); // mod level
			statDMPacket.writeInt(_client.user.battle.deaths); // deahts
			statDMPacket.writeInt(_client.user.battle.kills); // kills
			statDMPacket.writeByte(_client.user.rank); // rank
			statDMPacket.writeInt(_client.user.battle.score); // score
			statDMPacket.writeUTF(_client.user.username); // uid
		});

		this.sendPacket(-1959138292, statDMPacket);
	}

	userPlayingInfos() {
		const usersInfos = new ByteArray();
		usersInfos.writeUTF(this.client.user.username);
		usersInfos.writeInt(this.party.clients.length);

		this.party.clients.forEach((_client) => {
			usersInfos.writeInt(_client.user.privLevel); // mod level
			usersInfos.writeInt(_client.user.battle.deaths); // deahts
			usersInfos.writeInt(_client.user.battle.kills); // kills
			usersInfos.writeByte(_client.user.rank); // rank
			usersInfos.writeInt(_client.user.battle.score); // score
			usersInfos.writeUTF(_client.user.username); // uid
		});

		this.party.sendPacket(862913394, usersInfos, this.client);
	}

	updateHealth() {
		const userHealthPacket = new ByteArray();
		userHealthPacket.writeUTF(this.client.user.username);
		userHealthPacket.writeInt(this.health);
		this.party.sendPacket(-611961116, userHealthPacket);
	}
};
