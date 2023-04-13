const initResourcesJson = require("./initResourcesJson");
const initResources = require("./initResources");

const verifyUsername = require("./register/verifyUsername");
const sendUsernameAvailable = require("./register/sendUsernameAvailable");
const sendRecommendedNames = require("./register/sendRecommendedNames");
const registerUser = require("./register/registerUser");
const loginUser = require("./login/loginUser");
const executeLogin = require("./login/executeLogin");
const incorrectPassword = require("./login/incorrectPassword");
const removeForm = require("./login/removeForm");
const finishLogin = require("./login/finishLogin");
const loadEmail = require("./player/loadEmail");
const loadFriendList = require("./player/loadFriendList");
const loadPremium = require("./player/loadPremium");
const loadProfile = require("./player/loadProfile");
const statusBarLoaded = require("./player/statusBarLoaded");
const showNews = require("./player/lobby/showNews");
const initChatConfiguration = require("./player/lobby/initChatConfiguration");
const setChatDelay = require("./player/lobby/setChatDelay");
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

const socialNetworkPanel = require("./player/config/socialNetworkPanel");
const notificationEnabled = require("./player/config/notificationEnabled");

initClientFuncions = function () {
	this.initResourcesJson = initResourcesJson.bind(this);
	this.initResources = initResources.bind(this);

	// REGISTER
	this.verifyUsername = verifyUsername.bind(this);
	this.sendUsernameAvailable = sendUsernameAvailable.bind(this);
	this.sendRecommendedNames = sendRecommendedNames.bind(this);
	this.registerUser = registerUser.bind(this);

	// LOGIN
	this.loginUser = loginUser.bind(this);
	this.executeLogin = executeLogin.bind(this);
	this.incorrectPassword = incorrectPassword.bind(this);
	this.removeForm = removeForm.bind(this);
	this.finishLogin = finishLogin.bind(this);

	// PLAYER
	this.loadEmail = loadEmail.bind(this);
	this.loadFriendList = loadFriendList.bind(this);
	this.loadPremium = loadPremium.bind(this);
	this.loadProfile = loadProfile.bind(this);
	this.statusBarLoaded = statusBarLoaded.bind(this);
	// LOBBY
	this.showNews = showNews.bind(this);
	this.initChatConfiguration = initChatConfiguration.bind(this);
	this.setChatDelay = setChatDelay.bind(this);
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

	// CONFIGURAÇÕES
	this.socialNetworkPanel = socialNetworkPanel.bind(this);
	this.notificationEnabled = notificationEnabled.bind(this);
};

module.exports = initClientFuncions;
