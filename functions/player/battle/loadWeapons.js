const ByteArray = require("../../../modules/bytearray");

module.exports = function () {
	var packet = new ByteArray();

	packet.writeUTF(JSON.stringify(this.server.weapons));

	this.sendPacket(-2124388778, packet);
};
