const ByteArray = require("../../modules/bytearray");

loadEmail = function () {
	var packet = new ByteArray();
	packet.writeUTF(this.user.email);
	packet.writeBoolean(this.user.email ? 1 : 0); // has email ?

	this.sendPacket(613462801, packet);
};

module.exports = loadEmail;
