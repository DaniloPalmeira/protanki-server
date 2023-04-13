const Sequelize = require("sequelize");
const user = require("./user");
const friends = require("./friends");

const getUserById = async (id) => {
	let _user = await user.findByPk(id);
	if (_user) {
		return _user.dataValues;
	}
	return;
};

const getUserByUsername = async (username) => {
	let _user = await user.findOne({
		where: Sequelize.where(
			Sequelize.fn("lower", Sequelize.col("username")),
			Sequelize.fn("lower", username)
		),
	});
	if (_user) {
		return _user.dataValues;
	}
	return;
};

const getUserByEmail = async (email) => {
	let _user = await user.findOne({
		where: Sequelize.where(
			Sequelize.fn("lower", Sequelize.col("email")),
			Sequelize.fn("lower", email)
		),
	});
	if (_user) {
		return _user.dataValues;
	}
	return;
};

const getFriendsOrCreateByID = async (id) => {
	let _friends = await friends.findOrCreate({
		where: { uid: id },
		defaults: { uid: id },
	});
	var ObjFriends = {};
	let keys = [
		"friendsAccepted",
		"friendsAcceptedNew",
		"friendsIncoming",
		"friendsIncomingNew",
		"friendsOutgoing",
	];
	keys.map((key) => {
		if (ObjFriends[key] === undefined) ObjFriends[key] = {};
		ObjFriends[key] = JSON.parse(_friends[0].dataValues[key]);
	});
	return ObjFriends;
};

const updateFriends = async (keys, friendsObj, id) => {
	let options = {};
	for (let index = 0; index < keys.length; index++) {
		const key = keys[index];
		options[key] = JSON.stringify(friendsObj[key]);
	}

	friends.update(options, {
		where: { uid: id },
	});
};

module.exports = {
	getUserById,
	getUserByUsername,
	getUserByEmail,
	getFriendsOrCreateByID,
	updateFriends,
};
