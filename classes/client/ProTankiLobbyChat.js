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

	/**
	 * Envia uma lista de mensagens de chat para o cliente.
	 * @param {Array} messageList - A lista de mensagens de chat a serem enviadas.
	 */
	sendMessageList(messageList) {
		const packet = new ByteArray();
		const client = this.client;

		// Escreve o tamanho da lista de mensagens no pacote
		packet.writeInt(messageList.length);

		// Loop através da lista de mensagens de chat
		messageList.map((message) => {
			// Verifica se há informações de status de usuário remetente na mensagem
			if (message.sourceUserStatus) {
				packet.writeByte(0); // Escreve o byte indicando que há informações de status de usuário
				packet.writeInt(message.sourceUserStatus.chatModeratorLevel);
				packet.writeUTF(message.sourceUserStatus.IP);
				packet.writeInt(message.sourceUserStatus.rankIndex);
				packet.writeUTF(message.sourceUserStatus.userID);
			} else {
				packet.writeByte(1); // Escreve o byte indicando que não há informações de status de usuário
			}

			// Escreve a flag system na mensagem de chat
			packet.writeBoolean(message.system);

			// Verifica se há informações de status de usuário destinatário na mensagem
			if (message.targetUserStatus) {
				packet.writeByte(0); // Escreve o byte indicando que há informações de status de usuário
				packet.writeInt(message.targetUserStatus.chatModeratorLevel);
				packet.writeUTF(message.targetUserStatus.IP);
				packet.writeInt(message.targetUserStatus.rankIndex);
				packet.writeUTF(message.targetUserStatus.userID);
			} else {
				packet.writeByte(1); // Escreve o byte indicando que não há informações de status de usuário
			}

			// Escreve o texto da mensagem de chat
			packet.writeUTF(message.text);

			// Escreve a flag warning na mensagem de chat
			packet.writeBoolean(message.warning);
		});

		// Verifica se a lista de mensagens de chat possui apenas uma mensagem
		// e se não é igual ao histórico de chat do servidor, então adiciona a mensagem
		// ao histórico de chat do servidor e envia o pacote para o lobby de chat
		if (messageList.length === 1 && messageList !== client.server.chatHistory) {
			client.server.chatHistory.push(messageList[0]);
			client.lobbyChatServer.sendPacket(-1263520410, packet);
		} else {
			// Caso contrário, envia o pacote para o cliente
			this.sendPacket(-1263520410, packet);
		}
	}

	obtainChatMessages() {
		this.sendMessageList(this.client.server.chatHistory);
	}
};
