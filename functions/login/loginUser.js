const ByteArray = require("../../modules/bytearray");

loginUser = function (packet) {
	var username = packet.readUTF();
	var password = packet.readUTF();

	var rememberMe = packet.readBoolean();

	this.executeLogin({ username, password });
};

module.exports = loginUser;
