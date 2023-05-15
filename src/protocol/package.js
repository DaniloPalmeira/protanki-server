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
	const { username, battle } = user;
	const { incarnation, physics } = battle;

	if (!battle || !username || !physics) {
		logger.error("tankiParamsPacket: Invalid user object");
		return null;
	}

	const packet = new ByteArray();

	packet.writeUTF(username);
	packet.writeFloat(physics.hull.maxSpeed); // maxSpeed
	packet.writeFloat(physics.hull.maxTurnSpeed); // maxTurnSpeed
	packet.writeFloat(physics.turret.turret_turn_speed); // maxTurretRotationSpeed
	packet.writeFloat(physics.hull.acceleration); // acceleration
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
	const physics = battle.physics;

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
		maxSpeed: physics.hull.maxSpeed,
		maxTurnSpeed: physics.hull.maxTurnSpeed,
		acceleration: physics.hull.acceleration,
		reverseAcceleration: physics.hull.reverseAcceleration,
		sideAcceleration: physics.hull.sideAcceleration,
		turnAcceleration: physics.hull.turnAcceleration,
		reverseTurnAcceleration: physics.hull.reverseTurnAcceleration,
		mass: physics.hull.mass,
		power: physics.hull.power,
		dampingCoeff: physics.hull.dampingCoeff,
		turret_turn_speed: physics.turret.turret_turn_speed,
		health: battle.health,
		rank: user.rank,
		kickback: physics.turret.kickback,
		turretTurnAcceleration: physics.turret.turretTurnAcceleration,
		impact_force: physics.turret.impact_force,
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
