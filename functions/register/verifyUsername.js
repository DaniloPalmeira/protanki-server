const { getUserByUsername } = require("../../modules/database/db");

verifyUsername = async function (packet) {
	let username = packet.readUTF();
	if (username) {
		let user = await getUserByUsername(username);
		if (user) {
			this.sendRecommendedNames(username);
		} else {
			this.sendUsernameAvailable();
		}
	}
};

module.exports = verifyUsername;
