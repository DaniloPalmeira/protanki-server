const ByteArray = require("../../../modules/bytearray");

module.exports = function (packet) {
	var battleName = packet.readUTF();

	packet = new ByteArray();

	packet.writeUTF(battleName);

	this.sendPacket(120401338, packet);
};
