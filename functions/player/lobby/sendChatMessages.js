const ByteArray = require("../../../modules/bytearray");

sendChatMessages = function (messageList) {
	var packet = new ByteArray();

	packet.writeInt(messageList.length);

	messageList.map((message) => {
		var formato = {
			sourceUserStatus: null,
			targetUserStatus: null,
			system: false,
			warning: false,
			text: null,
		};

		if (message.sourceUserStatus) {
			packet.writeByte(0);
			packet.writeInt(message.sourceUserStatus.chatModeratorLevel);
			packet.writeUTF(message.sourceUserStatus.IP);
			packet.writeInt(message.sourceUserStatus.rankIndex);
			packet.writeUTF(message.sourceUserStatus.userID);
		} else {
			packet.writeByte(1);
		}

		packet.writeBoolean(message.system ? message.system : false);

		if (message.targetUserStatus) {
			packet.writeByte(0);
			packet.writeInt(message.targetUserStatus.chatModeratorLevel);
			packet.writeUTF(message.targetUserStatus.IP);
			packet.writeInt(message.targetUserStatus.rankIndex);
			packet.writeUTF(message.targetUserStatus.userID);
		} else {
			packet.writeByte(1);
		}

		packet.writeUTF(message.text);

		packet.writeBoolean(message.warning ? message.warning : 0);
	});

	if (messageList.length == 1) {
		this.server.chatHistory.push(messageList[0]);
		this.lobbyChat.sendPacket(-1263520410, packet);
	} else {
		this.sendPacket(-1263520410, packet);
	}
};

module.exports = sendChatMessages;
