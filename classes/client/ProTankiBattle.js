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

	weaponsInfos() {
		var packet = new ByteArray();

		packet.writeObject(this.server.weapons);

		this.sendPacket(-2124388778, packet);
	}
};
