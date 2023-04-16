const ByteArray = require("../../../classes/ByteArray");

loadChatMessages = function () {
	this.sendChatMessages(this.server.chatHistory);
};

module.exports = loadChatMessages;
