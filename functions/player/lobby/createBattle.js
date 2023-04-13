const ProTankiBattle = require("../../../modules/Interface/ProTankiBattle");
const ByteArray = require("../../../modules/bytearray");

module.exports = function (packet) {
	var bData = {};

	bData.autoBalance = packet.readBoolean();
	bData.battleMode = packet.readInt(); // 0 = DM	// 1 = TDM	// 2 = CTF	// 3 = CP	// 4 = AS
	bData.equipmentConstraintsMode = packet.readInt(); // 0 NONE; // 1 HORNET_RAILGUN; // 2 WASP_RAILGUN; // 3 HORNET_WASP_RAILGUN;
	bData.friendlyFire = packet.readBoolean();
	bData.scoreLimit = packet.readInt();
	bData.timeLimitInSec = packet.readInt();
	bData.map = packet.readUTF();
	// bData.mapId = packet.readUTF();

	bData.maxPeople = packet.readInt();
	//bData.maxPeopleCount = packet.readInt();
	bData.name = packet.readUTF();
	bData.parkourMode = packet.readBoolean();
	bData.privateBattle = packet.readBoolean();
	bData.proBattle = packet.readBoolean();
	bData.maxRank = packet.readInt();
	bData.minRank = packet.readInt();
	bData.reArmorEnabled = packet.readBoolean();
	if (!bData.proBattle) {
		bData.reArmorEnabled = true;
	}
	bData.theme = packet.readInt(); // 0 = SUMMER; // 1 = WINTER; // 2 = SPACE; // 3 = SUMMER_DAY; // 4 = SUMMER_NIGHT; // 5 = WINTER_DAY;
	bData.withoutBonuses = packet.readBoolean();
	bData.withoutCrystals = packet.readBoolean();
	bData.withoutSupplies = packet.readBoolean();
	bData.withoutUpgrades = packet.readBoolean();
	bData.battleId = this.server.randomID(16);

	this.server.battleList[bData.battleId] = new ProTankiBattle({
		...bData,
		server: this.server,
		owner: this.user.username,
	});

	var _packet = new ByteArray();

	_packet.writeUTF(JSON.stringify(this.server.battleList[bData.battleId].new));

	this.lobby.sendPacket(802300608, _packet);
	this.getBattleInfos(bData.battleId);
};
