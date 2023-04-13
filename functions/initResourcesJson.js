const ByteArray = require("../modules/bytearray");

module.exports = function (json, callbackID) {
	var packet = new ByteArray();

	packet.writeUTF(json);
	packet.writeInt(callbackID);

	this.sendPacket(-1797047325, packet);
};
