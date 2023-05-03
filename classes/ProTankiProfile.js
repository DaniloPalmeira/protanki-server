const ByteArray = require("./ByteArray");

const ProTankiFriends = require("./ProTankiFriends");
const PKG = require("../helpers/pkg.json");

module.exports = class ProTankiProfile {
	constructor(client) {
		this.client = client;
		this.friends = new ProTankiFriends(client);
	}

	// FUNÇÕES SINCRONAS

	sendPacket(packetID, packet = new ByteArray()) {
		this.client.sendPacket(packetID, packet);
	}

	sendPremiumInfo() {
		const packet = new ByteArray();
		packet.writeBoolean(false); // needShowNotificationCompletionPremium
		packet.writeBoolean(false); // needShowWelcomeAlert
		packet.writeFloat(99665.5234375); // reminderCompletionPremiumTime
		packet.writeBoolean(true); // wasShowAlertForFirstPurchasePremium
		packet.writeBoolean(false); // wasShowReminderCompletionPremium
		packet.writeInt(16777243); // lifeTimeInSeconds

		this.sendPacket(PKG.ME_PREMIUM_INFOS, packet);
	}

	sendProfileInfo() {
		const packet = new ByteArray();
		const _user = this.client.user;
		packet.writeInt(_user.crystal); // crystals
		packet.writeInt(_user.currentRankScore); // currentRankScore
		packet.writeInt(86400000); // durationCrystalAbonement
		packet.writeBoolean(true); // hasDoubleCrystal
		packet.writeInt(_user.nextRankScore); // nextRankScore
		packet.writeInt(1); // place
		packet.writeByte(_user.rank); // rank
		packet.writeFloat(1222); // rating
		packet.writeInt(_user.experience); // score
		packet.writeInt(this.client.server.id); // serverNumber

		packet.writeUTF(_user.username); // uid

		const link = "http://ratings.generaltanks.com/pt_br/user/";
		packet.writeUTF(link); // userProfileUrl

		this.sendPacket(PKG.ME_PROFILE_INFOS, packet);
	}

	sendEmailInfo() {
		const packet = new ByteArray();
		const _user = this.client.user;
		packet.writeUTF(_user.email);
		packet.writeBoolean(!!_user.email); // emailConfirmed ?

		this.sendPacket(PKG.ME_EMAIL_INFOS, packet);
	}
	// FUNÇÕES ASSINCRONAS
};
