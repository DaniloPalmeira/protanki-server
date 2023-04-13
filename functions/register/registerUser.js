const { getUserByUsername } = require("../../modules/database/db");

registerUser = async function (packet) {
	let username = packet.readUTF();
	let password = packet.readUTF();

	let rememberMe = packet.readBoolean();

	let user = await getUserByUsername(username);

	if (user) {
		this.sendRecommendedNames(username);
	} else {
		this.server.database.user
			.create({ username, password })
			.then(() => this.executeLogin({ username, password }));
	}
};

module.exports = registerUser;
