const ByteArray = require("../../../classes/ByteArray");

socialNetworkPanel = function () {
	var packet = new ByteArray();
	var socialNetworks = {
		vkontakte: {
			link: "https://oauth.vk.com/authorize?client_id=7889475&response_type=code&display=page&redirect_uri=http://146.59.110.195:8090/externalEntrance/vkontakte/?session=-4811882778452478",
			exist: false,
		},
	};

	packet.writeBoolean(true);
	packet.writeInt(Object.keys(socialNetworks).length);

	for (const [key, value] of Object.entries(socialNetworks)) {
		packet.writeUTF(value.link);
		packet.writeBoolean(value.exist ? value.exist : false);
		packet.writeUTF(key);
	}

	this.sendPacket(-583564465, packet);
};

module.exports = socialNetworkPanel;
