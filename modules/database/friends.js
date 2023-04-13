const Sequelize = require("sequelize");
const dbconnection = require("./connection");

const user = dbconnection.define("friends", {
	uid: {
		type: Sequelize.INTEGER,
		allowNull: false,
		unique: true,
		primaryKey: true,
	},
	friendsAccepted: {
		type: Sequelize.STRING,
		allowNull: false,
		defaultValue: "[]",
	},
	friendsAcceptedNew: {
		type: Sequelize.STRING,
		allowNull: false,
		defaultValue: "[]",
	},
	friendsIncoming: {
		type: Sequelize.STRING,
		allowNull: false,
		defaultValue: "[]",
	},
	friendsIncomingNew: {
		type: Sequelize.STRING,
		allowNull: false,
		defaultValue: "[]",
	},
	friendsOutgoing: {
		type: Sequelize.STRING,
		allowNull: false,
		defaultValue: "[]",
	},
});

module.exports = user;
