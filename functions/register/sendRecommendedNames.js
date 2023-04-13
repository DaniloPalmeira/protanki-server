const ByteArray = require("../../modules/bytearray");

sendRecommendedNames = function (username) {
	var packet = new ByteArray();

	var sugestions = Array(5)
		.fill()
		.map(() => {
			return username + Math.floor(Math.random() * (99 - 0 + 1) + 0);
		});

	packet.writeByte(0);
	packet.writeInt(sugestions.length);

	for (let index = 0; index < sugestions.length; index++) {
		const element = sugestions[index];
		packet.writeUTF(element);
	}

	this.sendPacket(442888643, packet);
};

module.exports = sendRecommendedNames;
