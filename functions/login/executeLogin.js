const Sequelize = require("sequelize");
const ByteArray = require("../../modules/bytearray");
const { getUserByUsername } = require("../../modules/database/db");

executeLogin = async function (loginData) {
	let _user = await getUserByUsername(loginData.username);
	if (_user && _user.password == loginData.password) {
		if (_user.privLevel == -1) {
			let _packet = new ByteArray().writeUTF(
				"Esta conta está bloqueada permanentemente, acesse ou crie outra"
			);
			this.sendPacket(-600078553, _packet);
		} else {
			this.finishLogin(_user);
		}
	} else {
		this.incorrectPassword();
	}
};

module.exports = executeLogin;
