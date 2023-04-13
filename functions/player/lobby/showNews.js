const ByteArray = require("../../../modules/bytearray");

showNews = function () {
	var packet = new ByteArray();

	var newsList = [
		[
			"https://icons.playprotanki.com/couple_mini.png",
			"14.02.2023",
			'Isso tudo é apenas um teste de um servidor privado de ProTanki<br><br><u><a href="https://github.com/DaniloPalmeira">Link do projeto</a></u>',
		],
	];

	// newsList = [[foto, data, texto]]

	packet.writeInt(newsList.length);
	newsList.map((news) => {
		news.map((info) => {
			packet.writeUTF(info);
		});
	});

	this.sendPacket(-260270890, packet);
};

module.exports = showNews;
