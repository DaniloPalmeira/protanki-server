const ByteArray = require("./ByteArray");
const PKG = require("../helpers/pkg.json");
const { getUserById, updateFriends } = require("../helpers/db");

module.exports = class {
	constructor(client) {
		this.client = client;
	}

	// FUNÇÕES SINCRONAS
	sendPacket(packetID, packet = new ByteArray()) {
		this.client.sendPacket(packetID, packet);
	}

	// FUNÇÕES ASSINCRONAS

	async loadFriendList() {
		const packet = new ByteArray();
		const _friends = {
			friendsAccepted: [],
			friendsAcceptedNew: [],
			friendsIncoming: [],
			friendsIncomingNew: [],
			friendsOutgoing: [],
		};

		const friends = this.client.user.friends;
		for (const key in friends) {
			const elementList = friends[key];
			for (let index = 0; index < elementList.length; index++) {
				const element = elementList[index];
				const _user = await getUserById(element);
				if (_user) {
					_friends[key].push(_user.username);
				}
			}
		}

		const keys = [
			"friendsAccepted",
			"friendsAcceptedNew",
			"friendsIncoming",
			"friendsIncomingNew",
			"friendsOutgoing",
		];

		keys.forEach((key) => {
			packet.writeByte(0);
			packet.writeInt(_friends[key].length);
			_friends[key].forEach((username) => {
				packet.writeUTF(username);
			});
		});

		this.sendPacket(1422563374, packet);
	}

	async search(username) {
		let _user = await this.client.ObtainUserByUsername(username);
		if (_user != undefined && this.client.user.username != _user.username) {
			this.sendPacket(-707501253);
		} else {
			this.sendPacket(-1490761936);
		}
	}

	async sendRequest(username) {
		const currentUser = this.client.user;
		const userToSendRequest = await this.client.ObtainUserByUsername(username);

		if (
			userToSendRequest == undefined ||
			currentUser.username == userToSendRequest.username
		) {
			return; // Sai da função se o usuário não for encontrado ou for o próprio usuário.
		}

		const currentUserFriends = currentUser.friends;
		const userToSendRequestFriends = userToSendRequest.friends;

		// Verifica se já são amigos
		if (currentUserFriends.friendsAccepted.includes(userToSendRequest.uid)) {
			const userToSendNamePacket = new ByteArray();
			userToSendNamePacket.writeUTF(userToSendRequest.username);
			this.sendPacket(-2089008699, userToSendNamePacket);
			return;
		}

		// Verifica se tem um pedido pendente
		if (currentUserFriends.friendsIncoming.includes(userToSendRequest.uid)) {
			const userToConfirmAddPacket = new ByteArray();
			userToConfirmAddPacket.writeUTF(userToSendRequest.username);
			this.sendPacket(-1258754138, userToConfirmAddPacket);
			return;
		}

		// Verifica se já enviou um pedido
		if (currentUserFriends.friendsOutgoing.includes(userToSendRequest.uid)) {
			const userTryAddNamePacket = new ByteArray();
			userTryAddNamePacket.writeUTF(userToSendRequest.username);
			this.sendPacket(2064692768, userTryAddNamePacket);
			return;
		}

		if (!currentUserFriends.friendsAccepted.includes(userToSendRequest.uid)) {
			const userToSendRequestNamePacket = new ByteArray();
			userToSendRequestNamePacket.writeUTF(userToSendRequest.username);
			this.sendPacket(-1241704092, userToSendRequestNamePacket);

			currentUserFriends.friendsOutgoing.push(userToSendRequest.uid);
			updateFriends(["friendsOutgoing"], currentUserFriends, currentUser.uid);
		}

		if (!userToSendRequestFriends.friendsIncoming.includes(currentUser.uid)) {
			// Envia a resposta ao usuário que recebeu a solicitação.
			if (userToSendRequest.client) {
				const usernamePacket = new ByteArray();
				usernamePacket.writeUTF(currentUser.username);
				userToSendRequest.client.sendPacket(553380510, usernamePacket);
			}

			userToSendRequestFriends.friendsIncomingNew.push(currentUser.uid);
			userToSendRequestFriends.friendsIncoming.push(currentUser.uid);
			updateFriends(
				["friendsIncomingNew", "friendsIncoming"],
				userToSendRequestFriends,
				userToSendRequest.uid
			);
		}
	}

	async deleteRequest(username) {
		let _user = await this.client.ObtainUserByUsername(username);
		if (_user) {
			this.deleteRequestDB(this.client.user, _user);
		}
	}

	async acceptedRequest(username) {
		let _user = await this.client.ObtainUserByUsername(username);
		if (_user) {
			this.acceptedRequestDB(_user, this.client.user);
		}
	}

	async refusedRequest(username) {
		let _user = await this.client.ObtainUserByUsername(username);
		if (_user) {
			this.deleteRequestDB(_user, this.client.user);
		}
	}

	async remove(username) {
		let _user = await this.client.ObtainUserByUsername(username);
		if (_user) {
			this.removeDB(this.client.user, _user);
		}
	}

	clearAcceptedNew(packet) {
		this.client.user.friends.friendsAcceptedNew = [];
		updateFriends(
			["friendsAcceptedNew"],
			this.client.user.friends,
			this.client.user.uid
		);
		this.sendPacket(PKG.FRIEND_REMOVE_NEW_NOTIFY, packet);
	}

	clearIncomingNew(packet) {
		this.client.user.friends.friendsIncomingNew = [];
		updateFriends(
			["friendsIncomingNew"],
			this.client.user.friends,
			this.client.user.uid
		);
		this.sendPacket(PKG.FRIEND_REMOVE_NEW_REQUEST_NOTIFY, packet);
	}

	/**
	 * Função responsável por cancelar uma solicitação de amizade enviada pelo usuário `userSend` para o usuário `userRecv`.
	 *
	 * @param {Object} userSend - Objeto representando o usuário que enviou a solicitação de amizade.
	 * @param {Object} userRecv - Objeto representando o usuário que recebeu a solicitação de amizade.
	 */
	deleteRequestDB(userSend, userRecv) {
		// Busca o índice do usuário `userSend` na lista de amigos recebidos pelo usuário `userRecv`.
		let index = userRecv.friends.friendsIncoming.indexOf(userSend.uid);

		// Se o usuário `userSend` está na lista de amigos recebidos, remove ele da lista.
		if (index !== -1) {
			// Remove o usuário `userSend` também da lista de amigos recebidos pelo usuário `userRecv`,
			// se ele estiver presente nessa lista.
			userRecv.friends.friendsIncoming.splice(index, 1);

			// Define o array de parâmetros a serem atualizados como ["friendsIncoming"].
			const paramsToUpdate = ["friendsIncoming"];

			// Remove o usuário `userSend` também da lista de novos amigos recebidos pelo usuário `userRecv`,
			// se ele estiver presente nessa lista.
			index = userRecv.friends.friendsIncomingNew.indexOf(userSend.uid);
			if (index !== -1) {
				userRecv.friends.friendsIncomingNew.splice(index, 1);

				// Adiciona o parâmetro "friendsIncomingNew" ao array de parâmetros a serem atualizados.
				paramsToUpdate.push("friendsIncomingNew");
			}

			if (userRecv.client) {
				const userSendUsernamePacket = new ByteArray();
				userSendUsernamePacket.writeUTF(userSend.username);
				userRecv.client.sendPacket(-1885167992, userSendUsernamePacket);
			}

			// Atualiza os dados dos parâmetros presentes no array de parâmetros a serem atualizados.
			updateFriends(paramsToUpdate, userRecv.friends, userRecv.uid);
		}

		// Busca o índice do usuário `userRecv` na lista de amigos enviados pelo usuário `userSend`.
		index = userSend.friends.friendsOutgoing.indexOf(userRecv.uid);

		// Se o usuário `userRecv` está na lista de amigos enviados, remove ele da lista.
		if (index !== -1) {
			userSend.friends.friendsOutgoing.splice(index, 1);

			if (userSend.client) {
				const userRecvUsernamePacket = new ByteArray();
				userRecvUsernamePacket.writeUTF(userRecv.username);
				userSend.client.sendPacket(614714702, userRecvUsernamePacket);
			}

			// Atualiza a lista de amigos enviados do usuário `userSend`.
			updateFriends(["friendsOutgoing"], userSend.friends, userSend.uid);
		}
	}

	/**
	 * Adiciona um usuário como amigo do outro
	 * @param {object} userSender - Objeto contendo informações do usuário que está enviando a solicitação
	 * @param {object} userReceiver - Objeto contendo informações do usuário que está recebendo a solicitação
	 */
	acceptedRequestDB(userSender, userReceiver) {
		// Verifica se userReceiver tem um convite pendente de userSender
		const incomingIndex = userReceiver.friends.friendsIncoming.indexOf(
			userSender.uid
		);
		if (incomingIndex === -1) {
			console.log(
				`${userReceiver.username} não tem um convite pendente de ${userSender.username}`
			);
			return;
		}

		// Verifica se userSender enviou um convite para userReceiver
		const outgoingIndex = userSender.friends.friendsOutgoing.indexOf(
			userReceiver.uid
		);
		if (outgoingIndex === -1) {
			console.log(
				`${userSender.username} não enviou um convite para ${userReceiver.username}`
			);
			return;
		}

		// Remove o convite pendente de userReceiver
		userReceiver.friends.friendsIncoming.splice(incomingIndex, 1);

		// Remove o convite enviado de userSender
		userSender.friends.friendsOutgoing.splice(outgoingIndex, 1);

		// Adiciona userReceiver como amigo de userSender
		userSender.friends.friendsAcceptedNew.push(userReceiver.uid);
		userSender.friends.friendsAccepted.push(userReceiver.uid);

		// Atualiza os dados de amigos de userSender
		updateFriends(
			["friendsOutgoing", "friendsAcceptedNew", "friendsAccepted"],
			userSender.friends,
			userSender.uid
		);

		// Adiciona userSender como amigo de userReceiver
		userReceiver.friends.friendsAcceptedNew.push(userSender.uid);
		userReceiver.friends.friendsAccepted.push(userSender.uid);

		// Atualiza os dados de amigos de userReceiver
		updateFriends(
			["friendsIncoming", "friendsAcceptedNew", "friendsAccepted"],
			userReceiver.friends,
			userReceiver.uid
		);

		if (userReceiver.client) {
			const senderUsernamePacket = new ByteArray();
			senderUsernamePacket.writeUTF(userSender.username);
			userReceiver.client.sendPacket(-139645601, senderUsernamePacket);
		}

		if (userSender.client) {
			const receiverUsernamePacket = new ByteArray();
			receiverUsernamePacket.writeUTF(userReceiver.username);
			userSender.client.sendPacket(-139645601, receiverUsernamePacket);
		}
	}

	/**
	 * Remove a amizade entre dois usuários.
	 * @param {Object} userSender - O objeto de usuário que iniciou a ação.
	 * @param {Object} userReceiver - O objeto de usuário que recebeu a ação.
	 */
	removeDB(userSender, userReceiver) {
		// Obter o índice do userSender na lista de amigos do userReceiver.
		const receiverIndex = userReceiver.friends.friendsAccepted.indexOf(
			userSender.uid
		);

		// Se userSender não estiver na lista de amigos do userReceiver, encerrar a função.
		if (receiverIndex === -1) {
			console.log(
				`O usuário ${userSender.username} não está na lista de amigos do usuário ${userReceiver.username}.`
			);
			return;
		}

		// Obter o índice do userReceiver na lista de amigos do userSender.
		const senderIndex = userSender.friends.friendsAccepted.indexOf(
			userReceiver.uid
		);

		// Se userReceiver não estiver na lista de amigos do userSender, encerrar a função.
		if (senderIndex === -1) {
			console.log(
				`O usuário ${userReceiver.username} não está na lista de amigos do usuário ${userSender.username}.`
			);
			return;
		}

		let index = userReceiver.friends.friendsAcceptedNew.indexOf(userSender.uid);
		if (index !== -1) {
			userReceiver.friends.friendsAcceptedNew.splice(index, 1);
		}

		let inde2 = userSender.friends.friendsAcceptedNew.indexOf(userReceiver.uid);
		if (inde2 !== -1) {
			userSender.friends.friendsAcceptedNew.splice(inde2, 1);
		}

		// Se o userReceiver estiver conectado, enviar um pacote de dados com o nome do userSender.
		if (userReceiver.client) {
			const senderUsernamePacket = new ByteArray();
			senderUsernamePacket.writeUTF(userSender.username);
			userReceiver.client.sendPacket(1716773193, senderUsernamePacket);
		}

		// Se o userSender estiver conectado, enviar um pacote de dados com o nome do userReceiver.
		if (userSender.client) {
			const receiverUsernamePacket = new ByteArray();
			receiverUsernamePacket.writeUTF(userReceiver.username);
			userSender.client.sendPacket(1716773193, receiverUsernamePacket);
		}

		// Remover o userSender da lista de amigos do userReceiver.
		userReceiver.friends.friendsAccepted.splice(receiverIndex, 1);

		// Remover o userReceiver da lista de amigos do userSender.
		userSender.friends.friendsAccepted.splice(senderIndex, 1);

		// Atualizar as informações de amigos do userSender no banco de dados.
		updateFriends(
			["friendsAccepted", "friendsAcceptedNew"],
			userSender.friends,
			userSender.uid
		);

		// Atualizar as informações de amigos do userReceiver no banco de dados.
		updateFriends(
			["friendsAccepted", "friendsAcceptedNew"],
			userReceiver.friends,
			userReceiver.uid
		);
	}
};
