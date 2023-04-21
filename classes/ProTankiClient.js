const ByteArray = require("./ByteArray");
const ProTankiUser = require("./client/ProTankiUser");
const { getUserByEmail } = require("../helpers/db");
const ProTankiRegister = require("./client/ProTankiRegister");
const ProTankiLogin = require("./client/ProTankiLogin");
const ProTankiLobby = require("./client/ProTankiLobby");
const ProTankiLobbyChat = require("./client/ProTankiLobbyChat");
const ProTankiGarage = require("./client/ProTankiGarage");
const ProTankiBattle = require("./client/ProTankiBattle");
const ProTankiResources = require("./client/ProTankiResources");
const PKG = require("../helpers/pkg.json");

class ProTankiClient {
	language = "ru";

	decrypt_position = 0;
	encrypt_position = 0;

	encryptionLenght = 8;
	decrypt_keys = new Array(8);
	encrypt_keys = new Array(8);

	constructor(data) {
		Object.assign(this, data);
		this.resources = new ProTankiResources(this);

		this.rawDataReceived = new ByteArray(Buffer.alloc(0));

		console.log("Nova conexão pelo IP:", this.socket.remoteAddress);

		this.socket.on("data", (data) => this.onDataReceived(data));
		this.socket.on("close", () => this.onConnectionClose());

		this.server.addClient(this);
		this.gerateCryptKeys();

		this.user = new ProTankiUser(this);
		this.register = new ProTankiRegister(this);
		this.login = new ProTankiLogin(this);
	}

	onConnectionClose() {
		if (this.user !== undefined) {
			this.user.online = false;
		}
		this.server.removeClient(this);
		console.log("Conexão encerrada com o IP:", this.socket.remoteAddress);
	}

	gerateCryptKeys() {
		var packet = new ByteArray();

		var keys = [-104, -46, -99, -122];

		packet.writeInt(keys.length);
		keys.map((val) => {
			[packet.writeByte(val)];
		});

		this.sendPacket(2001736388, packet, false);

		this.setCrypsKeys(keys);

		return keys;
	}

	setCrypsKeys = async (keys) => {
		var locaoako2 = 0;
		var base = 0;
		while (locaoako2 < keys.length) {
			base ^= keys[locaoako2];
			locaoako2 += 1;
		}
		var locaoako3 = 0;
		while (locaoako3 < this.encryptionLenght) {
			this.encrypt_keys[locaoako3] = base ^ (locaoako3 << 3);
			this.decrypt_keys[locaoako3] = base ^ (locaoako3 << 3) ^ 87;
			locaoako3 += 1;
		}
	};

	decryptPacket(BArray) {
		var loc2 = 0;
		var loc3 = 0;

		var ByteA = new ByteArray(BArray.buffer);

		while (loc2 < BArray.buffer.length) {
			loc3 = ByteA.readByte();

			this.decrypt_keys[this.decrypt_position] =
				loc3 ^ this.decrypt_keys[this.decrypt_position];

			BArray.buffer[loc2] = this.decrypt_keys[this.decrypt_position];

			this.decrypt_position ^= this.decrypt_keys[this.decrypt_position] & 7;

			loc2 += 1;
		}
	}

	encryptPacket(BArray) {
		var loc2 = 0;
		var loc3 = 0;

		var ByteA = new ByteArray(BArray.buffer);

		while (loc2 < BArray.buffer.length) {
			loc3 = ByteA.readByte();

			BArray.buffer[loc2] = loc3 ^ this.encrypt_keys[this.encrypt_position];

			this.encrypt_keys[this.encrypt_position] = loc3;

			this.encrypt_position ^= loc3 & 7;

			loc2 += 1;
		}
	}

	async onDataReceived(data = null) {
		if (data != null) {
			this.rawDataReceived.write(data);
		}

		var possibleLen = this.rawDataReceived.readInt() - 4;

		if (this.rawDataReceived.bytesAvailable() >= possibleLen) {
			var _data = new ByteArray(this.rawDataReceived.readBytes(possibleLen));
			this.parsePacket(_data);
			if (this.rawDataReceived.bytesAvailable() > 0) {
				await this.onDataReceived();
			}
		} else {
			this.rawDataReceived.writeIntStart(possibleLen + 4);
			console.log(
				"Pacote imcompleto",
				possibleLen - 4,
				this.rawDataReceived.bytesAvailable(),
				this.rawDataReceived
			);
		}
	}

	parsePacket(packet) {
		var packetID = packet.readInt();

		this.decryptPacket(packet);

		if (packetID == PKG.SET_LANGUAGE) {
			this.setLanguage(packet);
		} else if (packetID == PKG.INVITE_CODE_VERIFY) {
			const code = packet.readUTF();
			if (code === "noob") {
				const userCanLoginOnly = new ByteArray();
				userCanLoginOnly.writeUTF("");
				this.sendPacket(PKG.INVITE_CODE_LOGIN, userCanLoginOnly);
			} else if (code === "new") {
				this.sendPacket(PKG.INVITE_CODE_NEW_USER);
			} else {
				this.sendPacket(PKG.INVITE_CODE_INVALID);
			}
		} else if (packetID == PKG.AUTOLOGIN) {
			console.log("HASH", packet.readUTF());
			this.sendPacket(PKG.AUTOLOGIN_CANCEL);
		} else if (packetID == -82304134) {
			var callback = packet.readInt();
			if (callback == 1) {
				this.setInviteState();
				this.initLoginPage();
				this.removeLoading();
			} else if (callback == 2) {
				this.changeLayout(0, 0);
				this.initArchivaments();
				this.lobby.showNews();
				this.lobbyChat.configuration();
				this.lobbyChat.chatDelay();
				this.lobbyChat.obtainChatMessages();
				this.lobby.mapsList();
				this.lobby.battleList();
			} else if (callback == 3) {
				// LOAD USER GARAGE
				var jsonGarageUser = {
					items: [],
					garageBoxId: 170001,
				};

				var jsonGarageToBuy = JSON.parse(JSON.stringify(this.server.garage));
				jsonGarageToBuy.items = [];
				var userGarageItems = this.user.garage;

				for (let index = 0; index < this.server.garage.items.length; index++) {
					const element = this.server.garage.items[index];
					if (
						element.category in userGarageItems &&
						element.id in userGarageItems[element.category]
					) {
						if (element.modificationID != undefined) {
							if (
								element.modificationID ==
								userGarageItems[element.category][element.id].m
							) {
								element.count =
									userGarageItems[element.category][element.id].count;
								jsonGarageUser.items.push(element);
							} else {
								jsonGarageToBuy.items.push(element);
							}
						} else {
							element.count =
								userGarageItems[element.category][element.id].count;
							jsonGarageUser.items.push(element);
						}
					} else {
						jsonGarageToBuy.items.push(element);
					}
				}

				this.sendPacket(
					-255516505,
					new ByteArray().writeObject(jsonGarageUser)
				);

				// EQUIPAR ITENS DA GARAGEM (Q ESTAVAM SALVOS)
				for (const key in this.user.garage) {
					const cat = this.user.garage[key];
					if (cat.equiped != undefined) {
						var itemToEquip =
							cat.equiped +
							"_m" +
							(cat[cat.equiped].m >= 0 ? cat[cat.equiped].m : 0);
						this.sendPacket(
							2062201643,
							new ByteArray().writeUTF(itemToEquip).writeBoolean(true)
						);
					}
				}

				this.sendPacket(
					-300370823,
					new ByteArray().writeObject(jsonGarageToBuy)
				);

				this.changeLayout(1, 1);
			} else if (callback == 4) {
				this.resources.loadByJSON(
					{
						resources: [
							{
								idhigh: "0",
								idlow: 268412,
								versionhigh: "0",
								versionlow: 1,
								lazy: false,
								alpha: false,
								type: 10,
							},
							{
								idhigh: "0",
								idlow: 31494,
								versionhigh: "0",
								versionlow: 1,
								lazy: false,
								alpha: false,
								type: 10,
							},
							{
								idhigh: "0",
								idlow: 57735,
								versionhigh: "0",
								versionlow: 1,
								lazy: false,
								alpha: false,
								type: 10,
							},
							{
								idhigh: "0",
								idlow: 927961,
								versionhigh: "0",
								versionlow: 1,
								lazy: false,
								alpha: false,
								type: 10,
							},
							{
								idhigh: "0",
								idlow: 987391,
								versionhigh: "0",
								versionlow: 1,
								lazy: false,
								alpha: false,
								type: 10,
							},
							{
								idhigh: "0",
								idlow: 45572,
								versionhigh: "0",
								versionlow: 1,
								lazy: false,
								alpha: false,
								type: 10,
							},
						],
					},
					5
				);
			} else if (callback == 5) {
				this.resources.loadByJSON(
					{
						resources: [
							{
								idhigh: "0",
								idlow: 684125,
								versionhigh: "0",
								versionlow: 3,
								lazy: false,
								type: 7,
							},
						],
					},
					6
				);
			} else if (callback == 6) {
				this.user.battle.mapParams();
				this.user.battle.bonusesParams();
				this.user.battle.StatisticsModel();
				this.sendPacket(-643105296); // INICIAR CHAT NA BATALHA
				// this.sendPacket(-305710715); // possivel ping
				this.user.battle.CodecBattleMineCC();
				this.sendPacket(930618015);
				this.user.battle.CodecStatisticsDMCC();
				this.sendPacket(1953272681);
				this.user.battle.CodecBattleMineCC();
				this.user.battle.suppliesPanel();
				this.user.battle.newTank();
				this.user.battle.table();
				this.user.battle.effects();
				this.user.battle.objetoIndefinido();
				this.changeLayout(3, 3);
				console.log(this.user.inSpect);
			} else {
				console.log("calback", callback);
			}
		} else if (packetID == PKG.BATTLE_MESSAGE) {
			// 606668848 | msg = system
			// 1532749363 | uid + msg = to spectators
			// 1259981343 | uid + msg + team = players
			// -449356094 | uid + msg + team = deu nada ???
			// -1331361684 | header = define titulo pro chat (no topo dele mas some)
			var message = packet.readUTF();
			var teamOnly = packet.readBoolean(); // team only
			if (this.user.inSpect) {
				this.user.battle.spectatorMessage(message, teamOnly);
				return;
			}
			var _packet = new ByteArray();
			_packet.writeUTF(this.user.username);
			_packet.writeUTF(message);
			_packet.writeInt(2);
			console.log("Nova mensagem no chat");
			this.user.battle.party.sendPacket(1259981343, _packet);
		} else if (packetID == PKG.REQUEST_CAPTCHA) {
			this.requestCaptcha(packet);
		} else if (packetID == PKG.REGISTER_VERIFY_USERNAME) {
			this.register.verifyUsername(packet);
		} else if (packetID == PKG.REGISTER_NEW_USER) {
			this.register.newUser(packet);
		} else if (packetID == PKG.LOGIN_CHECK_CREDENTIALS) {
			this.login.checkCredentials(packet);
		} else if (packetID == PKG.CHECK_CAPTCHA) {
			console.log("VERIFICAR CAPTCHA", packet);
			const position = packet.readInt();
			const value = packet.readInt();
			// VERIFICAR CAPTCHA (RECUPERAÇAO DE SENHA)
			let _packet = new ByteArray().writeInt(position);
			this.sendPacket(-819536476, _packet);
		} else if (packetID == 1744584433) {
			(async () => {
				let email = packet.readUTF();
				// VERIFICAR SE EMAIL EXISTE NO BANCO DE DADOS
				var infos = await getUserByEmail(email);
				if (infos) {
					this.sendPacket(-1607756600);
				} else {
					this.sendPacket(-262455387);
				}
			})();
			// AGUARDAR CÓDIGO DO EMAIL = -1607756600
			// EMAIL NÃO CADASTRADO = -262455387
		} else if (packetID == PKG.VERIFY_CODE_EMAIL) {
			let codigoEmail = packet.readUTF();
			console.log(codigoEmail);
			this.sendPacket(-16447159);
			// CONFIRMAR CÓDIGO QUE FOI ENVIADO PRO EMAIL
			// utf
			//CASO O CÓDIGO ESTEJA ERRADO ENVIAR = -16447159
			//CASO O CÓDIGO ESTEJA CERTO ENVIAR INFORMAÇOES DO USER = -2118900410 utf(email)
		} else if (packetID == 1441234714) {
			this.sendPacket(-437587751);
		} else if (packetID == 705454610) {
			(async function () {
				var mensagem = {};
				var source = this.user;
				mensagem.sourceUserStatus = source.userStatus;
				var targetName = packet.readUTF();

				if (targetName != "") {
					var target = await this.ObtainUserByUsername(targetName);
					mensagem.targetUserStatus = target.userStatus;
				}
				mensagem.text = packet.readUTF();

				this.lobbyChat.sendMessageList([mensagem]);
			}.call(this));
		} else if (packetID == PKG.LOBBY_BATTLE_INFOS) {
			this.lobby.getBattleInfos(packet);
		} else if (packetID == PKG.OPEN_MISSIONS_PANEL) {
			console.log("Tentanto abrir a tela de missões");
			const missionsPacket = new ByteArray();

			const missions = [
				{
					canSkipForFree: true,
					description: "Entregar bandeiras",
					finishCriteria: 999,
					image: 123333,
					prizes: [
						{
							count: 99999,
							name: "Cristais",
						},
					],
					progress: 0,
					questId: 0,
					skipCost: 50000,
				},
				{
					canSkipForFree: true,
					description: "Entregar bandeiras",
					finishCriteria: 999,
					image: 123333,
					prizes: [
						{
							count: 1000000,
							name: "Experiencia",
						},
					],
					progress: 0,
					questId: 1,
					skipCost: 50000,
				},
			];

			missionsPacket.writeInt(missions.length);
			missions.forEach((mission) => {
				missionsPacket.writeBoolean(mission.canSkipForFree);
				missionsPacket.writeUTF(mission.description);
				missionsPacket.writeInt(mission.finishCriteria);
				missionsPacket.writeInt(mission.image);
				missionsPacket.writeInt(mission.prizes.length);
				mission.prizes.forEach((prize) => {
					missionsPacket.writeInt(prize.count);
					missionsPacket.writeUTF(prize.name);
				});
				missionsPacket.writeInt(mission.progress);
				missionsPacket.writeInt(mission.questId);
				missionsPacket.writeInt(mission.skipCost);
			});

			missionsPacket.writeInt(0); // currentQuestLevel
			missionsPacket.writeInt(0); // currentQuestStreak
			missionsPacket.writeBoolean(false); // doneForToday
			missionsPacket.writeInt(123341); // questImage
			missionsPacket.writeInt(123345); // rewardImage

			this.sendPacket(809822533, missionsPacket);
		} else if (packetID == PKG.MISSION_CHANGE) {
			const missionId = packet.readInt();
			console.log(`Mudar missão de acordo com o id ${missionId}`);
		} else if (packetID == PKG.OPEN_BUY_PANEL) {
			console.log("Tentanto abrir a tela de compra");
			let _packet = new ByteArray();
			_packet.writeInt(948382);
			_packet.writeUTF("");
			_packet.writeUTF(
				'Parabéns, você recebeu o cartão bônus "Double Crystal". Com ele, você é cobrado duas vezes mais cristais do que de costume ao comprá-los com dinheiro real. Não importa quantos cristais você compre, você receberá de presente a mesma quantia. O cartão é válido apenas por 24 horas. Tenha tempo para fazer compras lucrativas!\n\nAtenção! Os cristais de bônus não são levados em consideração ao deduzir referências.'
			);
			this.sendPacket(-875418096, _packet);
		} else if (packetID == -731115522) {
			// ClientStoredSettings - Falta finalizar
			const showDamageEnabled = packet.readBoolean();
		} else if (packetID == PKG.OPEN_SETTINGS) {
			console.log("Abrindo tela de config");
			this.sendPacket(600420685);
		} else if (packetID == PKG.GET_SETTINGS) {
			console.log("Carregando tela de config");
			this.socialNetworkPanel();
			this.notificationEnabled();
		} else if (packetID == PKG.LOBBY_SET_BATTLE_NAME) {
			// DEFINIR O NOME DA BATALHA
			this.lobby.fixBattleName(packet);
		} else if (packetID == PKG.LOBBY_CREATE_BATTLE) {
			// CRIAR BATALHA
			this.lobby.createBattle(packet);
		} else if (packetID == PKG.LOBBY_OPEN_GARAGE) {
			// ABRIR GARAGEM
			this.openGarage();
		} else if (packetID == PKG.FRIEND_SEARCH) {
			// PESQUISAR NOME PARA ADICIONAR AMIGO
			const username = packet.readUTF();
			this.profile.friends.search(username);
		} else if (packetID == PKG.FRIEND_SEND_REQUEST) {
			// ENVIAR SOLICITAÇÃO DE AMIZADE
			const username = packet.readUTF();
			this.profile.friends.sendRequest(username);
		} else if (packetID == PKG.FRIEND_CANCEL_REQUEST) {
			// REMOVER SOLICITAÇÃO DE AMIZADE
			const username = packet.readUTF();
			this.profile.friends.deleteRequest(username);
		} else if (packetID == PKG.FRIEND_REMOVE_NEW_REQUEST_NOTIFY) {
			// REMOVER NOTIFICAÇÃO DE SOLICITAÇOES DE AMIZADE NOVAS
			this.profile.friends.clearIncomingNew(packet);
		} else if (packetID == PKG.FRIEND_ACCEPT_REQUEST) {
			// ACEITAR SOLICITAÇÃO DE AMIZADE
			const username = packet.readUTF();
			this.profile.friends.acceptedRequest(username);
		} else if (packetID == PKG.FRIEND_REFUSE_REQUEST) {
			// RECUSAR SOLICITAÇÃO DE AMIZADE
			const username = packet.readUTF();
			this.profile.friends.refusedRequest(username);
		} else if (packetID == PKG.FRIEND_REMOVE_NEW_NOTIFY) {
			// REMOVER NOTIFICAÇÃO DE SOLICITAÇOES DE AMIZADE ACEITAS
			this.profile.friends.clearAcceptedNew(packet);
		} else if (packetID == PKG.FRIEND_REMOVE) {
			// REMOVER AMIZADE
			const username = packet.readUTF();
			this.profile.friends.remove(username);
		} else if (packetID == PKG.REQUEST_USER_INFO) {
			var username = packet.readUTF();
			this.requestUserInfos(username);
		} else if (packetID == PKG.VIEW_ITEM_IN_GARAGE) {
			// PREVIEW DE PINTURA
			var item = packet.readUTF();
			if (item) {
				this.sendPacket(
					2062201643,
					new ByteArray().writeUTF(item).writeBoolean(true)
				);
			}
		} else if (packetID == PKG.GARAGE_EQUIP_ITEM) {
			this.garage.equipItem(packet);
		} else if (packetID == PKG.GARAGE_BUY_ITEM) {
			// COMPRAR ITEM NA GARAGEM
			var item = packet.readUTF();
			if (item) {
				var name = item.split("_m")[0];
				var modification = parseInt(item.split("_m")[1]);
				var quantity = packet.readInt();
				var value = packet.readInt();
				var canBuy = this.garage.tryBuyThisItem({
					name,
					modification,
					quantity,
					value,
					item,
				});
			}
		} else if (packetID == PKG.LOBBY_REQUEST_BATTLE_LIST) {
			// PEDIR LISTA DE BATALHAS
			this.loadLayout(0);
			this.sendPacket(1211186637); // REMOVER GARAGEM
			this.changeLayout(0, 0);
			this.lobby.mapsList();
			this.lobby.battleList();

			// // COMPRAR ITEM NA GARAGEM
			// var item = packet.readUTF();
			// if (item) {
			// 	var name = item.split("_m")[0];
			// 	var modification = parseInt(item.split("_m")[1]);
			// 	var quantity = packet.readInt();
			// 	var value = packet.readInt();
			// 	var canBuy = this.garage.tryBuyThisItem({
			// 		name,
			// 		modification,
			// 		quantity,
			// 		value,
			// 		item,
			// 	});
			// }
		} else if (packetID == PKG.BATTE_SPECTATOR_JOIN) {
			this.user.battle = new ProTankiBattle(this);
			this.user.battle.joinSpectator();
		} else if (packetID == 1484572481) {
			if (this.currentTime) {
				const doubleInt = new ByteArray();
				doubleInt.writeInt(5);
				doubleInt.writeInt(new Date() - this.currentTime);
				this.sendPacket(34068208, doubleInt);
			}
			setTimeout(() => {
				this.currentTime = new Date();
				this.sendPacket(-555602629);
			}, 1000);
		} else if (packetID == 268832557) {
			const tankiPacket = new ByteArray();
			tankiPacket.writeUTF(this.user.username);
			tankiPacket.writeFloat(13);
			tankiPacket.writeFloat(2.6179938316345215);
			tankiPacket.writeFloat(1.6999506950378418);
			tankiPacket.writeFloat(13);
			tankiPacket.writeShort(1);
			this.user.battle.party.sendPacket(-1672577397, tankiPacket);
			if (!this.user.inSpect) {
				const tankiPOPacket = new ByteArray();
				tankiPOPacket.writeBoolean(false);
				tankiPOPacket.writeFloat(-22763.44140625); // position - x
				tankiPOPacket.writeFloat(2887.464111328125); // position - y
				tankiPOPacket.writeFloat(200); // position - z
				tankiPOPacket.writeBoolean(false);
				tankiPOPacket.writeFloat(0); // orientation - x
				tankiPOPacket.writeFloat(0); // orientation - y
				tankiPOPacket.writeFloat(0); // orientation - z
				this.sendPacket(-157204477, tankiPOPacket);
			}
		} else if (packetID == -1284211503) {
			this.user.battle = new ProTankiBattle(this);
			this.user.battle.join();
		} else if (packetID == 2074243318) {
			// console.log("session", packet.readInt(), packet.readInt());
		} else if (packetID == -1378839846) {
			this.user.battle.updateHealth();
		} else {
			console.warn("Adicionar:", packetID, packet);
		}
	}

	sendPacket(packetID, packet = new ByteArray(), encryption = true) {
		if (encryption) {
			this.encryptPacket(packet);
		}

		var byteA = new ByteArray()
			.writeInt(packet.buffer.length + 8)
			.writeInt(packetID)
			.write(packet.buffer).buffer;

		this.socket.write(byteA);
	}

	/**
	 * Define a notificação de convites como habilitadas ou desabilitadas
	 *
	 * @function notificationEnabled
	 * @returns {void}
	 */
	notificationEnabled() {
		// Cria um novo objeto ByteArray
		var packet = new ByteArray();

		// Escreve um valor booleano "true" ou "false" no objeto
		packet.writeBoolean(true);

		// Envia o pacote de dados junto com um identificador específico (1447082276)
		// usando a função sendPacket()
		this.sendPacket(1447082276, packet);
	}

	/**
	 * Função para enviar um painel de redes sociais em um pacote.
	 */
	socialNetworkPanel() {
		// Criação de um novo objeto ByteArray para manipulação do pacote
		var packet = new ByteArray();

		// Lista de objetos representando as redes sociais
		var socialNetworks = [
			{
				name: "vkontakte", // Nome da rede social
				link: "https://oauth.vk.com/authorize?client_id=7889475&response_type=code&display=page&redirect_uri=http://146.59.110.195:8090/externalEntrance/vkontakte/?session=-4811882778452478", // Link da rede social
				exist: false, // Indicação se a rede social existe ou não
			},
		];

		// Escreve um valor booleano true no pacote
		packet.writeBoolean(true);

		// Escreve o tamanho da lista socialNetworks no pacote
		packet.writeInt(socialNetworks.length);

		// Loop para escrever os dados de cada rede social no pacote
		socialNetworks.forEach((network) => {
			const { name, link, exist } = network;
			packet.writeUTF(link); // Escreve o link da rede social no pacote
			packet.writeBoolean(exist ?? false); // Escreve a indicação se a rede social existe no pacote
			packet.writeUTF(name); // Escreve o nome da rede social no pacote
		});

		// Envia o pacote com os dados do painel de redes sociais
		this.sendPacket(-583564465, packet);
	}

	changeLayout(origin, state) {
		var packet = new ByteArray();

		packet.writeInt(origin);
		packet.writeInt(state);

		this.lobbyServer.removePlayer(this);
		this.garageServer.removePlayer(this);
		this.lobbyChatServer.removePlayer(this);
		this.lobby = null;
		this.battle = null;
		this.lobbyChat = null;
		this.garage = null;

		switch (state) {
			case 0:
				this.lobbyChatServer.addPlayer(this);
				this.lobbyServer.addPlayer(this);
				this.lobbyChat = new ProTankiLobbyChat(this);
				this.lobby = new ProTankiLobby(this);
				break;
			case 1:
				this.lobbyChatServer.addPlayer(this);
				this.garageServer.addPlayer(this);
				this.lobbyChat = new ProTankiLobbyChat(this);
				this.garage = new ProTankiGarage(this);
				break;
			default:
				break;
		}

		// 0 = battle_select
		// 1 = garage
		// 2 = payment
		// 3 = battle
		// 4 = reload_space

		console.log("Mudando tela....");

		this.sendPacket(-593368100, packet);
	}

	async requestUserInfos(username) {
		let _user = await this.ObtainUserByUsername(username);
		if (!_user.exist) return;

		//CodecOnlineNotifierData
		var _packet = new ByteArray();
		_packet.writeBoolean(_user.online); //online
		_packet.writeInt(1); //serverNumber
		_packet.writeUTF(_user.username); //userId
		this.sendPacket(2041598093, _packet);

		//CodecRankNotifierData
		var _packet_A = new ByteArray();
		_packet_A.writeInt(_user.rank); //rank
		_packet_A.writeUTF(_user.username); //userId
		this.sendPacket(-962759489, _packet_A);

		// SEI LA
		var _packet_B = new ByteArray();
		_packet_B.writeUTF(_user.username); //userId
		this.sendPacket(1941694508, _packet_B);

		//CodecPremiumNotifierData
		var _packet_C = new ByteArray();
		_packet_A.writeInt(32989); //tempo em segundos
		_packet_C.writeUTF(_user.username); //userId
		this.sendPacket(-2069508071, _packet_C);
	}

	setLanguage(packet) {
		this.language = packet.readUTF();
		if (this.language) {
			console.log("Novo acesso no idioma", this.language);

			this.setLoginSocialButtons();
			this.initCaptchaPositions();
			this.resources.loadByJSON(
				{
					resources: [
						{
							idhigh: "0",
							idlow: 343233,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 343122,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 790554,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 432322,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 523534,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 425689,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 124221,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123444,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 143111,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 523332,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 490113,
							versionhigh: "0",
							versionlow: 5,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 321232,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 158174,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 106777,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 342637,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 925137,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 523632,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 975465,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 895671,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 962237,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 965737,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 204,
							height: 204,
							numFrames: 25,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 545261,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 85,
							height: 85,
							numFrames: 30,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 389057,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 965887,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 175648,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 1000065,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 1000076,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 1000077,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 110001,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							weight: 32,
							height: 32,
							numFrames: 17,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 110002,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							weight: 32,
							height: 32,
							numFrames: 17,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 785656,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							weight: 102,
							height: 102,
							numFrames: 25,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 785657,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							weight: 102,
							height: 102,
							numFrames: 25,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 785658,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							weight: 102,
							height: 102,
							numFrames: 25,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 785659,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							weight: 102,
							height: 102,
							numFrames: 25,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 110004,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 200,
							height: 200,
							numFrames: 8,
							fps: 25,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 110005,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 204,
							height: 204,
							numFrames: 20,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 110006,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 128,
							height: 128,
							numFrames: 10,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 170001,
							versionhigh: "0",
							versionlow: 5,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 170004,
							versionhigh: "0",
							versionlow: 31,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 170005,
							versionhigh: "0",
							versionlow: 31,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 170006,
							versionhigh: "0",
							versionlow: 16,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 170007,
							versionhigh: "0",
							versionlow: 16,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 170008,
							versionhigh: "0",
							versionlow: 33,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 170014,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 170009,
							versionhigh: "0",
							versionlow: 16,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 170010,
							versionhigh: "0",
							versionlow: 16,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 170011,
							versionhigh: "0",
							versionlow: 16,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 170012,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 170013,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 584394,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 584396,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 584398,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 584399,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 667431,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 223994,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 223995,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 223996,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 223997,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 898926,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 700620,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 292255,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 142378,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 228333,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 97860,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 236695,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 256,
							height: 256,
							numFrames: 16,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 828576,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 179480,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 457612,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 433995,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 128,
							height: 128,
							numFrames: 10,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 756745,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 756746,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 756747,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 756748,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 756749,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 128,
							height: 128,
							numFrames: 16,
							fps: 20,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 423332,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 128,
							height: 128,
							numFrames: 8,
							fps: 60,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 234233,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 128,
							height: 128,
							numFrames: 8,
							fps: 60,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 756750,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 756751,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 114424,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 468379,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 932241,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 670581,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 963502,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 64,
							height: 79,
							numFrames: 6,
							fps: 20,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 966691,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 128,
							height: 128,
							numFrames: 11,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 900596,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 882103,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 212409,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 128,
							height: 128,
							numFrames: 11,
							fps: 20,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 550305,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 731304,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 128,
							height: 128,
							numFrames: 51,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 461967,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 810405,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 204,
							height: 51,
							numFrames: 5,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 810406,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 204,
							height: 51,
							numFrames: 5,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 810407,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 204,
							height: 51,
							numFrames: 5,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 810408,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 204,
							height: 51,
							numFrames: 5,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 44573,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 128,
							height: 128,
							numFrames: 13,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 689821,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 256,
							height: 150,
							numFrames: 11,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 842049,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 95981,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 128,
							height: 128,
							numFrames: 10,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 454272,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 342454,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 416395,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 128,
							height: 128,
							numFrames: 10,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 294478,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 153545,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 315290,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 339826,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 213432,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 575434,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 213443,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 686923,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 970970,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 78,
							height: 195,
							numFrames: 13,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 870536,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 75337,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 102,
							height: 102,
							numFrames: 5,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 600555,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 938575,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 500334,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 632224,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 242699,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 386284,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 226985,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 75329,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 122842,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 538453,
							versionhigh: "0",
							versionlow: 12,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 236578,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 44351,
							versionhigh: "0",
							versionlow: 12,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 500060,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 717912,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 694498,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 89214,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 525427,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 150231,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 102373,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 915688,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 560829,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 546583,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 982573,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 298097,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 992320,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 474249,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 199168,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 217165,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 370093,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 240260,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 567101,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 832304,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 345377,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 730634,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 930495,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 650249,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 752472,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 679479,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 752002,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 450080,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							weight: 170,
							height: 170,
							numFrames: 36,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 644720,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 128,
							height: 128,
							numFrames: 16,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 839177,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							weight: 64,
							height: 64,
							numFrames: 16,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 878808,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 269321,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 262233,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 373285,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 435325,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							weight: 170,
							height: 170,
							numFrames: 36,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 435326,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							weight: 170,
							height: 170,
							numFrames: 36,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 435327,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							weight: 170,
							height: 170,
							numFrames: 36,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 435328,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							weight: 170,
							height: 170,
							numFrames: 36,
							fps: 30,
							type: 11,
						},
						{
							idhigh: "0",
							idlow: 337970,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 4,
						},
						{
							idhigh: "0",
							idlow: 215691,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 906431,
							versionhigh: "0",
							versionlow: 5,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 948382,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 824172,
							versionhigh: "0",
							versionlow: 4,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 71622,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 716565,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 504645,
							versionhigh: "0",
							versionlow: 4,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 153186,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 580106,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 931026,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 6338,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 890676,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 802804,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 916624,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 682348,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 46049,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 907343,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 916625,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 682349,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 46050,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 907344,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 227169,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 377977,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 271004,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 257012,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 139472,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 219122,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 550964,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 165165,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 819540,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 385322,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 175994,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 142350,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 513347,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 347843,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 153457,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 937522,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 160287,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 557817,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 653204,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 20647,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 521900,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 18283,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 456708,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 758687,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 791739,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 679592,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 115070,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 388185,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 638066,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 332851,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 77397,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 999935,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 906685,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 369990,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 73852,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 839339,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 906686,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 369991,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 73853,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 839340,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 833050,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 544500,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 263824,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 482110,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 740019,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 431730,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 65798,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 933781,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 205731,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 31170,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 458970,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 768112,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 503709,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 15411,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 104552,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 551825,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 495014,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 132033,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 875465,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 499715,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 412744,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 412746,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 412748,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 412750,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							type: 17,
						},
						{
							idhigh: "0",
							idlow: 423232,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 234324,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 567446,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 342553,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 257437,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 747654,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 321333,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 23301,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 23302,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 119320,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 507538,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 821478,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 90740,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 931624,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 976299,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 98644,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 739386,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 438964,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 141405,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 967180,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 82151,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 444408,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 386784,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 192378,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 858789,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 448000,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 817810,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 554337,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 966681,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 966682,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 140028,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 423333,
							versionhigh: "0",
							versionlow: 24,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 423334,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 523562,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 633226,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 623464,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123521,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 867867,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 867868,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 867869,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 200304,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 493495,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 931954,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 746058,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 952497,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 498645,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 560996,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 53082,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 662824,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 523797,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 542023,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 216783,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 104412,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 906593,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 703442,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 78411,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 704601,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 529101,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 473605,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 929509,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 60284,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 258487,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 519187,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 299478,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 378667,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 265602,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 172172,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 48688,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 32379,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 689436,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 868766,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 996274,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 285466,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412123,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 312222,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412124,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412125,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412126,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412127,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412128,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412129,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412130,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412131,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412132,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412133,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412134,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412135,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412136,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412137,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412138,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412140,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412141,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412142,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412143,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412144,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412145,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412146,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412147,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412148,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412149,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412150,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412151,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412152,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412153,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412154,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412155,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412156,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412157,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412158,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412159,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412160,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412161,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412162,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412163,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 347545,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123333,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123334,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123335,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123336,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412321,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 412322,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123337,
							versionhigh: "0",
							versionlow: 3,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 234523,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123338,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123339,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123340,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123349,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123350,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123351,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123341,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123342,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123343,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123344,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123345,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123346,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123347,
							versionhigh: "0",
							versionlow: 2,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 123348,
							versionhigh: "0",
							versionlow: 1,
							lazy: false,
							alpha: true,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 745565,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 345634,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 133390,
							versionhigh: "0",
							versionlow: 3,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 133391,
							versionhigh: "0",
							versionlow: 3,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 237943,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 411252,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 745735,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 754253,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 237942,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 358360,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 15426,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 323196,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 224985,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 388954,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 506884,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 639103,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 856658,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 247963,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 764493,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 433647,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 729724,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 925895,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 759080,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 895614,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 75453,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 498200,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 678652,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 678653,
							versionhigh: "0",
							versionlow: 3,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 863668,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 189166,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 634634,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 513062,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 211243,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 913170,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 216527,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 891611,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 822084,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 550839,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 493342,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 945441,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 254357,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 323193,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 224984,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 975236,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 112176,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 971180,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 285375,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 499073,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 595443,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 360380,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 125877,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 8029,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 590485,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 383480,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 312281,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 476631,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 503187,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 165105,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 820513,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 112461,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 176082,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 7300,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 745643,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 579345,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 37897,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 756756,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 273395,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 178911,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 879456,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 273976,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 329784,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 283991,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 448649,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 313516,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 648625,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 287534,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 476411,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 929260,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 654854,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 997740,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 349598,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 388066,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 483442,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 64597,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 305862,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 98285,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 398352,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 318424,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 763886,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 565167,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 833634,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 600088,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 582437,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 812919,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 527717,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 935293,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 716880,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 504449,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 56426,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 679815,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 226358,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 664481,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 400614,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 283546,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 87317,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 694234,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 273155,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 538875,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 93644,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 627697,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 914790,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 933709,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 456564,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 716334,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 808472,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 708934,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 376683,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 618467,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 618988,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 447830,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 867226,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 575869,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 411251,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 892845,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 431795,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 194943,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 744586,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 891846,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 266150,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 14345,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 926799,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 713825,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 618323,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 676240,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 519019,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 756213,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 177037,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 942099,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 503187,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 262215,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 495607,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 219191,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 270866,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 276861,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 913735,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 303326,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 270446,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 967457,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 741170,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 928438,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 475454,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 331140,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 22385,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 196847,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 240560,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 637843,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 335175,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 133389,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 59887,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 952789,
							versionhigh: "0",
							versionlow: 2,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 72909,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 218449,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 906707,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 566575,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 544154,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 947887,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 967456,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 466737,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 864904,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 270999,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 352418,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 192763,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 602793,
							versionhigh: "0",
							versionlow: 3,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 864563,
							versionhigh: "0",
							versionlow: 3,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 379819,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 964405,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 374401,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 445319,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 170913,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 327695,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 876863,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 984755,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 875201,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 952241,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 983773,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 426643,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 729995,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 907392,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 431630,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
						{
							idhigh: "0",
							idlow: 165705,
							versionhigh: "0",
							versionlow: 1,
							lazy: true,
							alpha: false,
							type: 10,
						},
					],
				},
				1
			);
		}
	}

	setLoginSocialButtons() {
		var packet = new ByteArray();
		var buttons = [
			[
				"https://oauth.vk.com/authorize?client_id=7889475&response_type=code&display=page&redirect_uri=http://146.59.110.195:8090/externalEntrance/vkontakte/?session=-1753613718684519995",
				"vkontakte",
			],
		];

		buttons.map((button) => {
			button.map((info) => {
				packet.writeUTF(info);
			});
		});

		this.sendPacket(-1715719586, packet);
	}

	initCaptchaPositions() {
		var packet = new ByteArray();

		packet.writeInt(this.server.captchaLocations.length);

		for (let index = 0; index < this.server.captchaLocations.length; index++) {
			const element = this.server.captchaLocations[index];
			packet.writeInt(element);
		}

		this.sendPacket(321971701, packet);
	}

	setInviteState() {
		var packet = new ByteArray();

		packet.writeBoolean(this.server.requireInviteCode);

		this.sendPacket(444933603, packet);
	}

	initLoginPage() {
		var packet = new ByteArray();

		packet.writeInt(this.server.loginPage.background); // resource id
		packet.writeBoolean(this.server.loginPage.email); // require email
		packet.writeInt(this.server.loginPage.maxLength); // max lengthinitArchivaments
		packet.writeInt(this.server.loginPage.minLength); // min length

		this.sendPacket(-1277343167, packet);
	}

	removeLoading() {
		this.sendPacket(-1282173466);
	}

	requestCaptcha(packet) {
		var location = packet.readInt();
		this.sendCaptchaImage(location);
	}

	sendCaptchaImage(location) {
		var packet = new ByteArray();

		packet.writeInt(location); // captcha position id

		var imageB64 =
			"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";

		var img = new Buffer.from(imageB64, "Base64");

		packet.writeInt(img.length);
		packet.write(img);

		this.sendPacket(-1670408519, packet);
	}

	loadLayout(layout) {
		var packet = new ByteArray();
		packet.writeInt(layout);

		this.sendPacket(1118835050, packet);

		// 0 = battle_select
		// 1 = garage
		// 2 = payment
		// 3 = battle
		// 4 = reload_space
	}

	initArchivaments() {
		var archives = [0, 2, 4];

		// 0 = FIRST_RANK_UP
		// 1 = FIRST_PURCHASE
		// 2 = SET_EMAIL
		// 3 = FIGHT_FIRST_BATTLE
		// 4 = FIRST_DONATE

		var packet = new ByteArray();

		packet.writeInt(archives.length);

		archives.map((item) => {
			packet.writeInt(item);
		});

		this.sendPacket(602656160, packet);
	}

	async ObtainUserByUsername(
		username,
		forceUpdate = false,
		client = undefined
	) {
		if (!(username in this.server.users) || forceUpdate) {
			let _user = new ProTankiUser(client);
			await _user.loadByUsername(username);
			if (_user.exist) {
				this.server.users[username] = _user;
			}
		}
		if (username in this.server.users && client != undefined) {
			this.server.users[username].client = client;
		}
		return this.server.users[username];
	}

	async ObtainUserByUser(_userObj, forceUpdate = false, client = undefined) {
		if (!(_userObj.username in this.server.users) || forceUpdate) {
			let _user = new ProTankiUser(client);
			await _user.loadByUser(_userObj);
			if (_user.exist) {
				this.server.users[_userObj.username] = _user;
			}
		}
		if (_userObj.username in this.server.users && client != undefined) {
			this.server.users[_userObj.username].client = client;
		}
		return this.server.users[_userObj.username];
	}

	openGarage() {
		this.loadLayout(1);
		this.sendPacket(-324155151);

		const resources = [
			613847, 882260, 603366, 762221, 387779, 651066, 825544, 592136, 379077,
			43761, 608063, 508353, 553103, 103660, 686147, 595904, 705554, 882259,
			603365, 762220, 387778, 896849, 216993, 807842, 677721, 205433, 282433,
			770995, 875152, 412745, 412747, 412749, 412751, 262762, 581830, 926940,
			918917, 86316, 9428, 67785, 9711, 507813, 581114, 810956, 772221, 209093,
			930954, 725126, 72508, 629496, 265425, 67263, 923853, 209092, 930953,
			725125, 72507, 826132, 289133, 271579, 630759, 904690, 486892, 55428,
			64819, 730749, 500013, 914016, 832320, 882375, 511249, 372034, 185908,
			542698, 906451, 905090, 385917, 388968, 388967, 910936, 971083, 123597,
			123598, 123566, 123567, 123568, 123569, 123570, 123571, 123572, 123574,
			123575, 123576, 123577, 123578, 123579, 123580, 123581, 123582, 123583,
			123584, 123585, 123586, 123587, 123588, 123589, 123590, 123591, 123592,
			123593, 123594, 123595, 123596, 471061, 350240, 468704, 912977, 456516,
			95646, 682329, 300293, 769778, 123601, 981027, 246572, 201158, 107643,
			829177, 564917, 364130, 865963, 968399, 123600, 92554, 985440, 254675,
			344971, 123604, 5343, 277983, 112041, 201886, 46357, 388701, 600886,
			739321, 123599, 332230, 327089, 964904, 49564, 167323, 379571, 184125,
			791701, 648950, 123565, 669820, 123602, 645131, 494974, 16227, 186119,
			123603, 700822, 184733, 123605, 866855, 337676, 235659, 148905, 157268,
			378710, 321516, 645743, 213222, 876546, 476463, 345344, 124521, 415252,
			856855, 633256, 971085, 148906, 345346, 345345, 643246, 643245, 272402,
			875490, 102099, 580104, 417664, 390894, 922189, 783992, 922542, 892482,
			184586, 419174, 252605, 752370, 188269, 566195, 355510, 30158, 291770,
			836341, 458866, 620162, 846169, 482389, 743352, 431685, 587952, 482387,
			482390, 482391, 348673, 486103, 482393, 149964, 494235, 702421, 482392,
			482394, 254380, 482395, 533887, 677607, 703411, 841306, 525234, 511823,
			195900, 765374, 333579, 482396, 428601, 671068, 962041, 803390, 482397,
			310874, 33331, 482398, 353894, 175184, 977110, 855481, 19784, 482399,
			758173, 807884, 482400, 482401, 524803, 521658, 739955, 672648, 288940,
			969240, 390649, 393067, 482402, 426788, 583689, 297237, 95492, 131017,
			511824, 884861, 855523, 396547, 834458, 900943, 658830, 234018, 135239,
			749551, 405746, 490205, 660966, 482403, 482404, 289461, 243929, 84693,
			714942, 25966, 80128, 187001, 187002, 187003, 186998, 186999, 187000,
			765745, 765746, 765748, 765747, 765743, 533226, 423422, 51287, 602359,
			326343, 700690, 470883, 149381, 994995, 747941, 156789, 227313, 837531,
			871359, 765744, 186997, 524516, 789404, 45309, 122218, 868053, 784942,
			749669, 978053, 524809, 100096, 212942, 416096, 100527, 348039, 387176,
			395966, 133241, 187107, 136056, 408662, 846623, 817175, 890775, 817171,
			248829, 891798, 796471, 674687, 817162, 531101, 650392, 353567, 389934,
			817167, 215066, 817163, 239833, 687487, 126433, 617155, 817168, 226368,
			817169, 150010, 817165, 34073, 527428, 997998, 171873, 686233, 852231,
			643659, 268558, 254796, 817170, 397117, 817173, 227538, 817174, 864803,
			357931, 475042, 915892, 800215, 817177, 499689, 802465, 654396, 965911,
			817161, 817166, 360111, 660670, 817164, 673110, 20255, 634104, 842400,
			811482, 727483, 465714, 910731, 817172, 641622, 662139, 138495, 384066,
			687486, 239194, 817176, 478398, 89108, 208105, 288506, 66990, 243557,
			322006, 480054, 542199, 759852, 156904, 652351, 401654, 489242, 195617,
			15895, 114450, 528275, 252505, 452333, 684358, 42973, 683948, 452335,
			334541, 487144, 683952, 368261, 380858, 683947, 452334, 482522, 533224,
			452336, 452338, 80750, 851011, 683951, 683950, 825562, 641749, 683949,
			166230, 432233, 452337, 661713, 73360, 683946, 319554, 443119, 107132,
			558183, 205377, 474775,
		];

		this.resources.loadByListOfIds(resources, 3);
	}
}

module.exports = ProTankiClient;
