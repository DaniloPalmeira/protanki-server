const ByteArray = require("../../../classes/ByteArray");

initChatConfiguration = function () {
	var packet = new ByteArray();

	packet.writeBoolean(false); // ADMIN
	packet.writeBoolean(true); // antifloodEnabled
	packet.writeInt(60); // bufferSize
	packet.writeBoolean(true); // chatEnabled
	packet.writeInt(0); // chatModeratorLevel

	//linksWhiteList
	if (this.server.linksWhiteList.length > 0) {
		packet.writeByte(0);
		packet.writeInt(this.server.linksWhiteList.length);
		this.server.linksWhiteList.map((link) => {
			packet.writeUTF(link);
		});
	} else {
		packet.writeByte(1);
	}

	packet.writeInt(60); //minChar
	packet.writeInt(5); //minWord

	packet.writeUTF(this.user.username);

	packet.writeBoolean(true); // showLinks
	packet.writeBoolean(true); // typingSpeedAntifloodEnabled

	this.sendPacket(178154988, packet);
};

module.exports = initChatConfiguration;
