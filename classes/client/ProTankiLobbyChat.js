// Importação da classe ByteArray
const ByteArray = require("../ByteArray");
// Importação do objeto PKG
const PKG = require("../../helpers/pkg.json");

module.exports = class LobbyChat {
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
	 * Configuração de opções do bate-papo do lobby.
	 */
	configuration() {
		const packet = new ByteArray();

		packet.writeBoolean(false); // ADMIN
		packet.writeBoolean(true); // antifloodEnabled
		packet.writeInt(60); // bufferSize
		packet.writeBoolean(true); // chatEnabled
		packet.writeInt(0); // chatModeratorLevel

		// linksWhiteList
		if (this.client.server.linksWhiteList.length > 0) {
			packet.writeByte(0);
			packet.writeInt(this.client.server.linksWhiteList.length);
			this.client.server.linksWhiteList.forEach((link) => {
				packet.writeUTF(link);
			});
		} else {
			packet.writeByte(1);
		}

		packet.writeInt(60); // minChar
		packet.writeInt(5); // minWord

		packet.writeUTF(this.client.user.username);

		packet.writeBoolean(true); // showLinks
		packet.writeBoolean(true); // typingSpeedAntifloodEnabled

		// Envia o pacote de configuração para o cliente usando o ID de pacote definido em PKG.LOBBY_CHAT_CONFIGURATION
		this.sendPacket(PKG.LOBBY_CHAT_CONFIGURATION, packet);
	}

	/**
	 * Define o atraso do chat.
	 */
	chatDelay() {
		const packet = new ByteArray();
		const chatconfig = this.client.server.chatConfig;

		packet.writeInt(chatconfig.symbolCost);
		packet.writeInt(chatconfig.enterCost);

		this.sendPacket(PKG.LOBBY_CHAT_DELAY, packet);
	}
};
