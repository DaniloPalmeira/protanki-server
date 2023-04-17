const ByteArray = require("../ByteArray");
const { getUserByUsername, createAccount } = require("../../helpers/db");
const PKG = require("../../helpers/pkg.json");

module.exports = class ProTankiRegister {
	constructor(client) {
		this.client = client;
	}

	// FUNÇÕES SINCRONAS

	sendPacket(packetID, packet = new ByteArray()) {
		this.client.sendPacket(packetID, packet);
	}

	sendUsernameAvailable() {
		this.sendPacket(PKG.USERNAME_AVAILABLE);
	}

	sendRecommendedNames(username) {
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

		this.sendPacket(PKG.RECOMMENDED_NAMES, packet);
	}

	// FUNÇÕES ASSINCRONAS

	async verifyUsername(packet) {
		// Verificar se nome está disponivel para registro
		let username = packet.readUTF();
		if (username) {
			let user = await getUserByUsername(username);
			if (user) {
				this.sendRecommendedNames(username);
			} else {
				this.sendUsernameAvailable();
			}
		}
	}

	async newUser(packet) {
		let username = packet.readUTF();
		let password = packet.readUTF();

		let rememberMe = packet.readBoolean();

		let userExist = await getUserByUsername(username);

		if (!userExist) {
			let _user = await createAccount(username, password);
			if (_user) {
				this.client.login.executeLogin(_user.dataValues);
			}
		}
	}
};
