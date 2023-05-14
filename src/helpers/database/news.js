const Sequelize = require("sequelize");
const dbconnection = require("../connection");

const news = dbconnection.define("news", {
	id: {
		type: Sequelize.INTEGER,
		primaryKey: true,
		autoIncrement: true,
	},
	image: Sequelize.STRING,
	content: Sequelize.STRING,
});

module.exports = news;
