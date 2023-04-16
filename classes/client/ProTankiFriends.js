const ByteArray = require("../ByteArray");
const { getUserById } = require("../../modules/database/db");

module.exports = class {
	constructor(client) {
		this.client = client;
	}

	// FUNÇÕES SINCRONAS
	sendPacket(packetID, packet = new ByteArray()) {
		this.client.sendPacket(packetID, packet);
	}

	// FUNÇÕES ASSINCRONAS

	async loadFriendList() {
		const packet = new ByteArray();
		const _friends = {
			friendsAccepted: [],
			friendsAcceptedNew: [],
			friendsIncoming: [],
			friendsIncomingNew: [],
			friendsOutgoing: [],
		};

		const friends = this.client.user.friends;
		for (const key in friends) {
			const elementList = friends[key];
			for (let index = 0; index < elementList.length; index++) {
				const element = elementList[index];
				const _user = await getUserById(element);
				if (_user !== undefined) {
					_friends[key].push(_user.username);
				}
			}
		}

		const keys = [
			"friendsAccepted",
			"friendsAcceptedNew",
			"friendsIncoming",
			"friendsIncomingNew",
			"friendsOutgoing",
		];

		keys.forEach((key) => {
			packet.writeByte(0);
			packet.writeInt(_friends[key].length);
			_friends[key].forEach((username) => {
				packet.writeUTF(username);
			});
		});

		this.sendPacket(1422563374, packet);
	}
};
