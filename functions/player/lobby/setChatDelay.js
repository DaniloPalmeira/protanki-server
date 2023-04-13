const ByteArray = require("../../../modules/bytearray");

setChatDelay = function () {
	var packet = new ByteArray();

	packet.writeInt(this.server.chatConfig.symbolCost);
	packet.writeInt(this.server.chatConfig.enterCost);

	this.sendPacket(744948472, packet);
};

module.exports = setChatDelay;
