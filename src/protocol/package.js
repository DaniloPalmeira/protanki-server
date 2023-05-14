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

const buildTankPacket = (client) => {
	const { user } = client;
	const { battle } = user;
	const { hull, turret, paint } = battle.equipament;

	const packet = new ByteArray();
	const tankiInfos = {
		battleId: battle.party.id,
		colormap_id: paint.coloring,
		hull_id: `${hull.id}_m${hull.m}`,
		turret_id: `${turret.id}_m${turret.m}`,
		team_type: battle.teamStr,
		partsObject: JSON.stringify({
			engineIdleSound: 386284,
			engineStartMovingSound: 226985,
			engineMovingSound: 75329,
			turretSound: 242699,
		}),
		hullResource: hull.object3ds,
		turretResource: turret.object3ds,
		sfxData: JSON.stringify(turret.sfxData || {}),
		position: battle.position,
		orientation: battle.orientation,
		incarnation: battle.incarnation,
		tank_id: user.username,
		nickname: user.username,
		state: battle.state,
		maxSpeed: hull.propers.HULL_SPEED.value,
		maxTurnSpeed: hull.propers.HULL_TURN_SPEED.value / 57.2957,
		acceleration: hull.propers.HULL_ACCELERATION.value,
		reverseAcceleration: 17,
		sideAcceleration: 24,
		turnAcceleration: 3.4906585,
		reverseTurnAcceleration: 6.4577184,
		mass: hull.propers.HULL_MASS.value,
		power: hull.propers.HULL_ACCELERATION.value,
		dampingCoeff: 900,
		turret_turn_speed: 1.6999506914424771,
		health: battle.health,
		rank: user.rank,
		kickback: 3,
		turretTurnAcceleration: 1.7599900177110819,
		impact_force: 7,
		state_null: battle.state_null,
	};
	packet.writeObject(tankiInfos);
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
	buildTankPacket,
};
