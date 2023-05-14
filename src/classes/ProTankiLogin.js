const ByteArray = require("./ByteArray");
const { getUserByUsername } = require("../helpers/db");
const PKG = require("../helpers/pkg.json");
const ProTankiProfile = require("./ProTankiProfile");

/**
 * Classe ProTankiLogin representa a lógica de login do jogo ProTanki.
 */
module.exports = class ProTankiLogin {
	constructor(client) {
		this.client = client;
	}

	/**
	 * Função síncrona para enviar um pacote para o cliente.
	 * @param {number} packetID - O ID do pacote.
	 * @param {ByteArray} packet - O objeto ByteArray contendo os dados do pacote.
	 */
	sendPacket(packetID, packet = new ByteArray()) {
		this.client.sendPacket(packetID, packet);
	}

	/**
	 * Função para lidar com credenciais inválidas.
	 */
	invalidCredentials() {
		this.sendPacket(PKG.INVALID_CREDENTIALS);
	}

	/**
	 * Função para remover o formulário de login.
	 */
	removeForm() {
		this.sendPacket(PKG.REMOVE_LOGIN_FORM);
	}

	/**
	 * Função assíncrona para verificar as credenciais do usuário.
	 * @param {ByteArray} packet - O objeto ByteArray contendo os dados do pacote.
	 */
	async checkCredentials(packet) {
		const username = packet.readUTF();
		const password = packet.readUTF();
		const rememberMe = packet.readBoolean();

		const user = await getUserByUsername(username);
		if (user && user.password === password) {
			if (user.privLevel === -1) {
				const msg = new ByteArray();
				msg.writeUTF(
					"Esta conta foi bloqueada permanentemente, acesse ou crie outra"
				);
				this.sendPacket(PKG.MESSAGE_ALERT, msg);
			} else {
				await this.executeLogin(user);
			}
		} else {
			this.invalidCredentials();
		}
	}

	/**
	 * Função assíncrona para executar o login do usuário.
	 * @param {object} user - O objeto de usuário obtido do banco de dados.
	 */
	async executeLogin(user) {
		this.removeForm();

		const client = this.client;

		client.user = await client.ObtainUserByUser(user, true, client);
		client.user.online = true;
		client.profile = new ProTankiProfile(client);
		client.profile.sendPremiumInfo();
		client.profile.sendProfileInfo();
		client.profile.sendEmailInfo();
		client.resources.loadByID(115361);
		client.profile.friends.loadFriendList();

		const json = {
			resources: [],
		};

		client.resources.loadByJSON(json, 2);
	}
};
