const ByteArray = require("../../../classes/ByteArray");

getBattleInfos = function (packet) {
	if (typeof packet == typeof "battleId") {
		var battleId = packet;
	} else {
		var battleId = packet.readUTF();
	}
	if (!(battleId in this.server.battleList)) return;

	var battle = this.server.battleList[battleId];

	battle.addViewer(this);
	if (this.user.selectedBattle) {
		this.user.selectedBattle.removeViewer(this);
	}
	this.user.selectedBattle = battle;

	packet = new ByteArray();

	packet.writeUTF(
		JSON.stringify({
			...battle.show,
			spectator: this.user.spectator,
			userPaidNoSuppliesBattle:
				battle.owner == this.user.username
					? true
					: this.user.propass
					? true
					: false,
		})
	);

	this.sendPacket(546722394, packet);
};

module.exports = getBattleInfos;
