const ByteArray = require("../ByteArray");
const { getUserById } = require("../../helpers/db");

module.exports = class {
	constructor(client) {
		this.client = client;
	}

	// FUNÇÕES SINCRONAS
	sendPacket(packetID, packet = new ByteArray()) {
		this.client.sendPacket(packetID, packet);
	}
};
