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

	addPlayerInBattle(client) {
		var packet = new ByteArray();

		packet.writeUTF(client.battle.battleId);

		packet.writeUTF(client.battle.name);

		packet.writeInt(client.battle.modeInt);
		packet.writeBoolean(client.battle.privateBattle);
		packet.writeBoolean(client.battle.proBattle);

		packet.writeInt(client.battle.maxRank);
		packet.writeInt(client.battle.minRank);

		packet.writeInt(1); //serverNumber

		packet.writeUTF(client.user.username);

		this.sendPacket(-1895446889, packet);
	}
};
