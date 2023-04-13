const ByteArray = require("../../modules/bytearray");

loadPremium = function () {
	var packet = new ByteArray();
	packet.writeBoolean(false); // needShowNotificationCompletionPremium
	packet.writeBoolean(true); // needShowWelcomeAlert
	packet.writeFloat(100000); // reminderCompletionPremiumTime
	packet.writeBoolean(false); // wasShowAlertForFirstPurchasePremium
	packet.writeBoolean(true); // wasShowReminderCompletionPremium
	packet.writeInt(100000); // lifeTimeInSeconds

	this.sendPacket(1405859779, packet);
};

module.exports = loadPremium;
