// Importação da classe ByteArray
const ByteArray = require("../ByteArray");
// Importação do objeto PKG
const PKG = require("../../helpers/pkg.json");

module.exports = class {
	constructor(client) {
		this.client = client;
	}

	/**
	 * Envia um pacote para o cliente.
	 * @param {number} packetID - O ID do pacote a ser enviado.
	 * @param {ByteArray} packet - O pacote a ser enviado, opcionalmente pode ser fornecido um objeto ByteArray vazio.
	 */
	sendPacket(packetID, packet = new ByteArray()) {
		this.client.sendPacket(packetID, packet);
	}

	/**
	 * Exibe as notícias para o cliente.
	 */
	showNews() {
		const packet = new ByteArray();

		const newsList = [
			[
				"https://icons.playprotanki.com/couple_mini.png",
				"14.02.2023",
				'Isso tudo é apenas um teste de um servidor privado de ProTanki<br><br><u><a href="https://github.com/DaniloPalmeira/protanki-server">Link do projeto</a></u>',
			],
		];

		// newsList = [[foto, data, texto]]

		// Escreve o tamanho da lista de notícias no pacote
		packet.writeInt(newsList.length);

		// Percorre a lista de notícias e escreve as informações de cada notícia no pacote
		for (const news of newsList) {
			for (const info of news) {
				packet.writeUTF(info);
			}
		}

		// Envia o pacote de notícias para o cliente usando o ID de pacote definido em PKG.LOBBY_SHOW_NEWS
		this.sendPacket(PKG.LOBBY_SHOW_NEWS, packet);
	}
};
