const ByteArray = require("../ByteArray");

module.exports = class {
	constructor() {
		this.clients = [];
	}

	sendPacket(packedID, packet) {
		this.clients.forEach((client) => {
			var _packet = new ByteArray(packet.buffer);
			client.sendPacket(packedID, _packet);
		});
	}

	addPlayer(client) {
		if (!this.clients.includes(client)) {
			this.clients.push(client);
		}
	}

	removePlayer(client) {
		if (this.clients.includes(client)) {
			this.clients = this.clients.filter(function (e) {
				return e !== client;
			});
		}
	}
};
