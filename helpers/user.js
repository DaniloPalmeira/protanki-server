const Sequelize = require("sequelize");
const dbconnection = require("./connection");

const user = dbconnection.define("users", {
	uid: {
		type: Sequelize.INTEGER,
		primaryKey: true,
		autoIncrement: true,
	},
	username: {
		type: Sequelize.STRING,
		allowNull: false,
		primaryKey: false,
		unique: true,
	},
	password: {
		type: Sequelize.STRING,
		allowNull: false,
	},
	privLevel: {
		type: Sequelize.INTEGER,
		allowNull: false,
		defaultValue: 0,
	},
	crystal: {
		type: Sequelize.INTEGER,
		allowNull: false,
		defaultValue: 500,
	},
	experience: {
		type: Sequelize.INTEGER,
		allowNull: false,
		defaultValue: 0,
	},
	premium: {
		type: "TIMESTAMP",
		allowNull: false,
		defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
	},
	email: {
		type: Sequelize.STRING,
		allowNull: true,
	},
	spectator: {
		type: Sequelize.BOOLEAN,
		allowNull: false,
		defaultValue: false,
	},
	garage: {
		type: Sequelize.STRING,
	},
});

module.exports = user;
