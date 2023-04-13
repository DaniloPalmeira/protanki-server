const ByteArray = require("../../modules/bytearray");
const { getUserById } = require("../../modules/database/db");

loadFriendList = async function () {
	var packet = new ByteArray();
	var _friends = {
		friendsAccepted: [],
		friendsAcceptedNew: [],
		friendsIncoming: [],
		friendsIncomingNew: [],
		friendsOutgoing: [],
	};

	let friends = this.user.friends;
	for (const key in friends) {
		const elementList = friends[key];
		for (let index = 0; index < elementList.length; index++) {
			const element = elementList[index];
			let _user = await getUserById(element);
			if (_user != undefined) {
				_friends[key].push(_user.username);
			}
		}
	}

	let keys = [
		"friendsAccepted",
		"friendsAcceptedNew",
		"friendsIncoming",
		"friendsIncomingNew",
		"friendsOutgoing",
	];

	keys.map((key) => {
		packet.writeByte(0);
		packet.writeInt(_friends[key].length);
		_friends[key].map(function (username) {
			packet.writeUTF(username);
		});
	});

	this.sendPacket(1422563374, packet);
};

module.exports = loadFriendList;
