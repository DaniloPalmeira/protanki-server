const ByteArray = require("./ByteArray");

module.exports = class {
	constructor(client) {
		this.client = client;
	}

	// FUNÇÕES SINCRONAS
	sendPacket(packetID, packet = new ByteArray()) {
		this.client.sendPacket(packetID, packet);
	}

	loadByID(resource) {
		var packet = new ByteArray();

		packet.writeInt(resource);

		this.sendPacket(834877801, packet);
	}

	loadByJSON(json, callbackID) {
		var packet = new ByteArray();

		packet.writeObject(json);
		packet.writeInt(callbackID);

		this.sendPacket(-1797047325, packet);
	}

	loadByListOfIds(listOfidlow, callbackID) {
		var packet = new ByteArray();

		const obj = {
			resources: this.client.server.resourceByIdList(listOfidlow),
		};

		console.log(callbackID, obj);

		packet.writeObject(obj);
		packet.writeInt(callbackID);

		this.sendPacket(-1797047325, packet);
	}
};
