const ByteArray = require("../../../classes/ByteArray");

loadBattleList = function () {
	var packet = new ByteArray();
	var jObject = {
		battles: [],
	};
	for (const [key, value] of Object.entries(this.server.battleList)) {
		jObject.battles.push(value.battleToList);
	}

	packet.writeUTF(JSON.stringify(jObject));

	this.sendPacket(552006706, packet);
};

module.exports = loadBattleList;
