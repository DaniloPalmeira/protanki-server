const Sequelize = require("sequelize");
const sequelize = new Sequelize({
	dialect: "sqlite",
	storage: "./src/data/database.sqlite",
	logging: false,
});

module.exports = sequelize;
