const initResourcesJson = require("./initResourcesJson");
const initResources = require("./initResources");

const loadChatMessages = require("./player/lobby/loadChatMessages");
const loadMapsList = require("./player/lobby/loadMapsList");
const loadBattleList = require("./player/lobby/loadBattleList");
const sendChatMessages = require("./player/lobby/sendChatMessages");
const getBattleInfos = require("./player/lobby/getBattleInfos");
const setBattleName = require("./player/lobby/setBattleName");
const createBattle = require("./player/lobby/createBattle");
const removeBattleList = require("./player/lobby/removeBattleList");
const removeLobbyChat = require("./player/lobby/removeLobbyChat");

const loadWeapons = require("./player/battle/loadWeapons");

const EquipItemInGarage = require("./player/garage/EquipItemInGarage");
const TryBuyThisItem = require("./player/garage/TryBuyThisItem");

initClientFuncions = function () {
	this.initResourcesJson = initResourcesJson.bind(this);
	this.initResources = initResources.bind(this);

	// LOBBY

	this.loadChatMessages = loadChatMessages.bind(this);
	this.loadMapsList = loadMapsList.bind(this);
	this.loadBattleList = loadBattleList.bind(this);
	this.sendChatMessages = sendChatMessages.bind(this);
	this.getBattleInfos = getBattleInfos.bind(this);
	this.setBattleName = setBattleName.bind(this);
	this.createBattle = createBattle.bind(this);
	this.removeBattleList = removeBattleList.bind(this);
	this.removeLobbyChat = removeLobbyChat.bind(this);
	// BATTLE
	this.loadWeapons = loadWeapons.bind(this);

	// GARAGE
	this.EquipItemInGarage = EquipItemInGarage.bind(this);
	this.TryBuyThisItem = TryBuyThisItem.bind(this);
};

module.exports = initClientFuncions;
