const ByteArray = require("../classes/ByteArray");
const logger = require("../helpers/logger");

const userStatsPacket = (user) => {
	const { battle, username } = user;
	if (!battle || !username) {
		logger.error("userStatsPacket: Invalid user object");
		return null;
	}
	const packet = new ByteArray()
		.writeInt(battle.deaths)
		.writeInt(battle.kills)
		.writeInt(battle.score)
		.writeUTF(username);
	return packet; // Return the buffer
};

const usernamePacket = (user) => {
	const { username } = user;
	if (!username) {
		logger.error("usernamePacket: Invalid user object");
		return null;
	}
	const packet = new ByteArray();
	packet.writeUTF(username);
	return packet; // Return the buffer
};

const tankiParamsPacket = (user) => {
	const { username } = user;
	const { battle } = user;
	const { equipament, incarnation } = battle;
	const { hull } = equipament;

	if (!battle || !username || !equipament || !hull) {
		console.log({ battle, username, hull });
		logger.error("tankiParamsPacket: Invalid user object");
		return null;
	}

	const packet = new ByteArray();

	packet.writeUTF(username);
	packet.writeFloat(hull.propers.HULL_SPEED.value); // maxSpeed
	packet.writeFloat(hull.propers.HULL_TURN_SPEED.value / 57.2957); // maxTurnSpeed
	packet.writeFloat(1.6999506950378418); // maxTurretRotationSpeed
	packet.writeFloat(hull.propers.HULL_ACCELERATION.value); // acceleration
	packet.writeShort(incarnation); // specificationId

	return packet;
};

const cameraPacket = (position, orientation) => {
	const packet = new ByteArray();
	packet.writePacket(vectorPacket(position));
	packet.writePacket(vectorPacket(orientation));

	return packet;
};

const vectorPacket = (coord, optional = false) => {
	const packet = new ByteArray();
	if (optional && (!coord.x || !coord.y || !coord.z)) {
		packet.writeBoolean(true);
		return packet;
	}

	packet.writeBoolean(false);
	packet.writeFloat(coord?.x ?? 0);
	packet.writeFloat(coord?.y ?? 0);
	packet.writeFloat(coord?.z ?? 0);

	return packet;
};

const createBonusPacket = (name, position, time) => {
	const packet = new ByteArray();
	packet.writeUTF(name);
	packet.writePacket(vectorPacket(position));
	packet.writeInt(time);
	return packet;
};

const rewardsPacket = (userRewards) => {
	const packet = new ByteArray();

	packet.writeInt(userRewards.length);
	userRewards.forEach((reward) => {
		packet.writeInt(reward.newbiesAbonementBonusReward);
		packet.writeInt(reward.premiumBonusReward);
		packet.writeInt(reward.reward);
		packet.writeUTF(reward.username);
	});
	packet.writeInt(10);

	return packet;
};

module.exports = {
	userStatsPacket,
	usernamePacket,
	tankiParamsPacket,
	cameraPacket,
	vectorPacket,
	createBonusPacket,
	rewardsPacket,
};
