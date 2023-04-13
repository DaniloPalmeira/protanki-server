const ByteArray = require("../../modules/bytearray");

loadProfile = function () {
	var packet = new ByteArray();
	packet.writeInt(this.user.crystal); // crystals
	packet.writeInt(this.user.currentRankScore); // currentRankScore
	packet.writeInt(-1); // durationCrystalAbonement
	packet.writeBoolean(true); // hasDoubleCrystal
	packet.writeInt(this.user.nextRankScore); // nextRankScore
	packet.writeInt(1); // place
	packet.writeByte(this.user.rank); // rank
	packet.writeFloat(3.0); // rating
	packet.writeInt(this.user.experience); // score
	packet.writeInt(1); // serverNumber

	packet.writeUTF(this.user.username); // uid

	link = "http://ratings.generaltanks.com/pt_br/user/";
	packet.writeUTF(link); // userProfileUrl

	this.sendPacket(907073245, packet);
};

module.exports = loadProfile;
