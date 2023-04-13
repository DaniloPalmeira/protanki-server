const ByteArray = require("../../../modules/bytearray");

loadChatMessages = function () {
	this.sendChatMessages(this.server.chatHistory);
};

module.exports = loadChatMessages;
