const ByteArray = require("../ByteArray");
const maps = require("../../maps/items.json");
const { rewardsPacket, userStatsPacket } = require("../../protocol/package");
const { Vector3 } = require("three");
const { v4: uuidv4 } = require("uuid");

function removerItem(lista, item) {
  let index = lista.indexOf(item);
  if (index !== -1) {
    lista.splice(index, 1);
  }
}

function newVector(obj) {
  if (!obj) {
    return new Vector3(0, 0, 0);
  }

  var { x, y, z } = obj;
  return new Vector3(x, y, z);
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
  validEquips = {
    1: { hull: "hornet", turret: "railgun" },
    2: { hull: "wasp", turret: "railgun" },
    3: { hull: ["wasp", "hornet"], turret: "railgun" },
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
  autoReturnFlagMS = 30000;

  usersBlue = [];
  usersRed = [];
  users = [];

  score = {};

  bonusList = [];
  mines = [];
  canPlay = true;

  startTime = null;
  session = false;

  ctf = {
    red: {
      base: new Vector3(),
      flag: new Vector3(),
      holder: null,
      lastAction: new Date(),
    },
    blue: {
      base: new Vector3(),
      flag: new Vector3(),
      holder: null,
      lastAction: new Date(),
    },
  };

  constructor(objData) {
    Object.assign(this, objData);
    this.definePreview();

    this.mapName = this.map.replace("map_", "");

    const positionExample = new Vector3(0, 0, 1000);

    const spawnsExample = [
      {
        position: positionExample,
        orientation: new Vector3(),
        example: true,
      },
    ];

    const propLoad = [
      "lighting",
      "map_graphic_data",
      "skybox",
      "sound_id",
      "dustParticle",
      "mapId",
    ];
    const localInfos = ["spawn", "points", "flags", "resources"];

    this.fullMapInfos =
      this.server.mapsInfos?.[this.mapName]?.[this.themeStr.toLowerCase()] ??
      {};

    this.mapInfos = propLoad.reduce((obj, propriedade) => {
      if (this.fullMapInfos.hasOwnProperty(propriedade)) {
        obj[propriedade] = this.fullMapInfos[propriedade];
      }
      return obj;
    }, {});

    this.mapInfos.skybox = this.getSkyboxObject(this.mapInfos.skybox);

    this.params = localInfos.reduce((obj, propriedade) => {
      if (this.fullMapInfos.hasOwnProperty(propriedade)) {
        obj[propriedade] = this.fullMapInfos[propriedade];
      }
      return obj;
    }, {});
    this.params.skybox = this.getSkyboxProperties(this.mapInfos.skybox);

    this.ctf.red.base = newVector(this.params.flags?.["red"]);
    this.ctf.blue.base = newVector(this.params.flags?.["blue"]);

    this.spawns = {
      NONE: spawnsExample,
      RED: spawnsExample,
      BLUE: spawnsExample,
    };

    if (Array.isArray(this.params.spawn)) {
      this.params.spawn.forEach(({ team, modes, position, orientation }) => {
        if (modes.includes(this.modeStr)) {
          if (this.spawns[team] == spawnsExample) {
            this.spawns[team] = [];
          }
          const spawn = { position, orientation, modes, team };
          this.spawns[team].push(spawn);
        }
      });
    }

    if (this.mapInfos.skybox !== null) {
      this.mapInfos.minRank = this.minRank;
      this.mapInfos.active = true;
      this.mapInfos.maxRank = this.maxRank;
      this.mapInfos.reArmorEnabled = this.reArmorEnabled;
      this.mapInfos.map_id = this.map;
      this.mapInfos.kick_period_ms = 300000;
      this.mapInfos.invisible_time = 3500;
      this.mapInfos.battleId = this.id;
      // this.mapInfos.map_graphic_data.gravity;
      this.mapInfos.map_graphic_data.mapId = this.map;
      this.mapInfos.map_graphic_data.mapTheme = this.themeStr;
    }
  }

  getSkyboxObject(skyboxKey) {
    // Verificar se a chave skybox existe no objeto skybox
    if (skyboxKey in this.server.mapsInfos.skybox) {
      // Retornar o objeto skybox correspondente à chave skybox
      return this.server.mapsInfos.skybox[skyboxKey];
    } else {
      // Retornar null se a chave skybox não for encontrada
      return null;
    }
  }

  getSkyboxProperties(skyboxObject) {
    // Verificar se o objeto skybox foi encontrado
    if (skyboxObject !== null) {
      // Retornar um array com os valores das propriedades do skybox
      return Object.values(skyboxObject);
    } else {
      // Retornar null se o objeto skybox não for encontrado
      return null;
    }
  }

  get timeLeftInSec() {
    if (this.timeLimitInSec === 0 || !this.startTime) {
      return 0;
    }

    const nowTime = new Date();
    const runningTime = (nowTime - this.startTime) / 1000;
    const timeLeft = this.timeLimitInSec - runningTime;
    return timeLeft;
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
      timeLeftInSec: this.timeLeftInSec,
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

  calculateRewards(users, fundTotal, criterio) {
    const totalScoreTeam = users.reduce((total, user) => {
      return total + user.battle[criterio];
    }, 0);

    const userListTeam = users
      .map((user) => {
        let reward = Math.floor(
          user.battle[criterio] * (fundTotal / totalScoreTeam)
        );
        reward = isNaN(reward) ? 0 : reward;

        const userRewardTotal = reward + 0 + 0;
        user.crystal += userRewardTotal;

        return {
          reward,
          username: user.username,
          premiumBonusReward: 0,
          newbiesAbonementBonusReward: 0,
        };
      })
      .filter((user) => user.reward > 0);

    return userListTeam;
  }

  startBattleTime(force = false) {
    if (force || this.clients.length === 0) {
      this.canPlay = true;
      if (!this.startTime) {
        this.startTime = new Date();
        this.finishBattleByTime();
      }
    }
  }

  finishBattleByTime() {
    var session = uuidv4();
    this.session = session;
    if (this.timeLimitInSec > 0) {
      setTimeout(() => {
        if (session === this.session) {
          this.finish();
        }
      }, this.timeLimitInSec * 1000);
    }
  }

  stopBattleTime() {
    if (this.startTime) {
      this.session = null;
      this.startTime = null;
      this.canPlay = false;
    }
  }

  finish() {
    this.canPlay = false;
    this.stopBattleTime();
    const { blue = 0, red = 0 } = this.score;
    const teamScoreTotal = blue + red;
    const fundByScore = this.fund / (teamScoreTotal <= 0 ? 1 : teamScoreTotal);
    const blueFundTotal = fundByScore * blue;
    const redFundTotal = fundByScore * red;

    const userRewards = [];

    userRewards.push(...this.calculateRewards(this.users, this.fund, "kills"));

    userRewards.push(
      ...this.calculateRewards(this.usersRed, redFundTotal, "score")
    );

    userRewards.push(
      ...this.calculateRewards(this.usersBlue, blueFundTotal, "score")
    );

    this.sendPacket(560336625, rewardsPacket(userRewards));
    this.clients.forEach((client) => {
      const { user } = client;
      const { battle } = user;
      battle.incarnation++;
    });
    setTimeout(() => {
      this.resetBattle();
    }, 11 * 1000);
  }

  async resetBattle() {
    this.startBattleTime(true);
    await this.changeTeams();
    this.clients.forEach((client) => {
      const { user } = client;
      const { battle } = user;
      battle.updateTankiData();
    });
    this.resetUserStat();
    this.resetFund();
    this.resetTime();
    this.resetScore();
    this.resetFlags();
  }

  async changeTeams() {
    function alterarTime(user) {
      user.battle.team =
        user.battle.team === 0
          ? 1
          : user.battle.team === 1
          ? 0
          : user.battle.team;

      return user;
    }

    const listaTemp = [...this.usersRed.map(alterarTime)];

    // Atribua os valores da this.usersBlue à lista1
    this.usersRed.length = 0;
    this.usersRed.push(...this.usersBlue.map(alterarTime));

    this.usersBlue.length = 0;
    this.usersBlue.push(...listaTemp);

    const _usersStatsPacket = new ByteArray();
    _usersStatsPacket.writeInt(this.usersRed.length);

    this.usersRed.forEach((user) => {
      _usersStatsPacket.writePacket(userStatsPacket(user));
    });

    _usersStatsPacket.writeInt(this.usersBlue.length);

    this.usersBlue.forEach((user) => {
      _usersStatsPacket.writePacket(userStatsPacket(user));
    });

    this.sendPacket(-1668779175, _usersStatsPacket);
  }

  resetFlags() {
    this.confirmAutoReturnFlag("red");
    this.confirmAutoReturnFlag("blue");
  }

  autoReturnFlag(flagColor, lastAction) {
    setTimeout(() => {
      this.confirmAutoReturnFlag(flagColor, lastAction);
    }, this.autoReturnFlagMS);
  }

  confirmAutoReturnFlag(flagColor, lastAction = null) {
    const flagId = flagColor === "red" ? 0 : 1;
    if (lastAction && this.ctf[flagColor].lastAction !== lastAction) {
      return;
    }

    if (this.ctf[flagColor].flag.x || this.ctf[flagColor].holder) {
      let packet = new ByteArray();
      packet.writeInt(flagId);
      packet.writeUTF(null);
      this.sendPacket(-1026428589, packet);

      this.ctf[flagColor].flag.set(0, 0, 0);
      this.ctf[flagColor].holder = null;
      this.ctf[flagColor].lastAction = new Date();
    }
  }

  resetUserStat() {
    const _userStatsPacket = new ByteArray();
    _userStatsPacket.writeInt(this.clients.length);

    this.clients.forEach((client) => {
      const { user } = client;
      const { battle } = user;
      battle.resetUserStat();
      _userStatsPacket.writePacket(userStatsPacket(user));
    });

    this.sendPacket(1061006142, _userStatsPacket);
  }

  resetFund() {
    this.fund = 0;

    const packet = new ByteArray();
    packet.writeInt(this.fund);

    this.sendPacket(1149211509, packet);
  }

  resetScore() {
    this.score = {};
    if (this.mode !== 0) {
      this.sendPacket(561771020, new ByteArray().writeInt(0).writeInt(0));
      this.sendPacket(561771020, new ByteArray().writeInt(1).writeInt(0));
    }
  }

  resetTime() {
    const packet = new ByteArray();
    packet.writeInt(this.timeLimitInSec);
    this.sendPacket(732434644, packet);
  }

  removePlayer(player) {
    removerItem(this.clients, player);
    removerItem(this.spectators, player);
    removerItem(this.users, player.user);
    removerItem(this.usersBlue, player.user);
    removerItem(this.usersRed, player.user);
    if (this.clients.length === 0) {
      this.stopBattleTime();
    }
  }

  sendPacketSpectator(packedID, packet = new ByteArray()) {
    this.spectators.forEach((client) => {
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
