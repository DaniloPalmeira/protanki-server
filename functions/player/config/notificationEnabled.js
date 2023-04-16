const ByteArray = require("../../../classes/ByteArray");

module.exports = function () {
	var packet = new ByteArray();

	packet.writeBoolean(true);

	this.sendPacket(1447082276, packet);
};
