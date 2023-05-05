const ByteArray = require("./ByteArray");
const { getUserByEmail, setUserNewsID } = require("../helpers/db");
const ProTankiRegister = require("./ProTankiRegister");
const ProTankiLogin = require("./ProTankiLogin");
const ProTankiLobby = require("./client/ProTankiLobby");
const ProTankiLobbyChat = require("./client/ProTankiLobbyChat");
const ProTankiGarage = require("./client/ProTankiGarage");
const ProTankiBattle = require("./client/ProTankiBattle");
const ProTankiResources = require("./ProTankiResources");
const PKG = require("../helpers/pkg.json");
const mainResources = require("../helpers/mainResources.json");
const logger = require("../helpers/logger");
const captcha = require("../helpers/captcha");

const fs = require("fs");

class ProTankiClient {
	language = "ru";

	layout = {
		front: 0,
		back: 0,
	};

	decrypt_position = 0;
	encrypt_position = 0;

	encryptionLenght = 8;
	decrypt_keys = new Array(8);
	encrypt_keys = new Array(8);

	i18Garage = {
		pt_BR: require("../helpers/garage/i18n/pt_BR.json"),
		en: require("../helpers/garage/i18n/en.json"),
		ru: require("../helpers/garage/i18n/ru.json"),
	};

	classBackup = {};

	reloadClassFile(className, client = this) {
		const classCode = fs.readFileSync(__dirname + className, "utf8");
		const compiledClass = eval(classCode);
		const novaInstancia = new compiledClass(client);

		if (client === this) {
			if (className in client.classBackup) {
				Object.getOwnPropertyNames(client.classBackup[className]).forEach(
					(propriedade) => {
						if (
							typeof client.classBackup[className][propriedade] !==
								"function" &&
							propriedade != "commands"
						) {
							novaInstancia[propriedade] =
								client.classBackup[className][propriedade];
						}
					}
				);
			}
			client.classBackup[className] = novaInstancia;
		}

		return novaInstancia;
	}

	constructor(data) {
		this.serverTime = new Date();
		Object.assign(this, data);
		this.resources = new ProTankiResources(this);

		this.rawDataReceived = new ByteArray(Buffer.alloc(0));

		logger.verbose(`Nova conexão pelo IP: ${this.socket.remoteAddress}`);

		this.socket.on("data", (data) => this.onDataReceived(data));
		this.socket.on("close", () => this.onConnectionClose());
		this.socket.on("error", () => this.onConnectionClose());

		this.server.addClient(this);
		this.gerateCryptKeys();

		this.user = this.reloadClassFile("/ProTankiUser.js");
		this.register = new ProTankiRegister(this);
		this.login = new ProTankiLogin(this);
		this.command = this.reloadClassFile("/ProTankiCommands.js");
	}

	reloadClass() {
		this.command = this.reloadClassFile("/ProTankiCommands.js");
		this.login = this.reloadClassFile("/ProTankiCommands.js");
		this.register = this.reloadClassFile("/ProTankiCommands.js");
		this.user = this.reloadClassFile("/ProTankiUser.js");
	}

	onConnectionClose() {
		if (this.user !== undefined) {
			this.user.online = false;
			if (this.user.battle) {
				this.user.battle.leave();
			}
		}

		this.server.removeClient(this);
		logger.verbose(`Conexão encerrada com o IP: ${this.socket.remoteAddress}`);
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

		if (
			![
				-114968993, 2074243318, 1484572481, -1683279062, 329279865, -1749108178,
			].includes(packetID)
		) {
			logger.debug(`Pacote recebido no ID: ${packetID}`);
		}

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
		} else if (packetID == PKG.LOAD_RESOURCE_CALLBACK) {
			var callback = packet.readInt();
			if (callback == 1) {
				this.setInviteState();
				this.initLoginPage();
				this.removeLoading();
			} else if (callback == 2) {
				this.initArchivaments();
				this.loadLayout({ layout: 0, chat: true, news: true });
			} else if (callback == 3) {
				// Carrega a garagem do usuário
				const userGarage = {
					items: [],
					garageBoxId: 170001,
				};
				const buyableGarage = { ...this.server.garage, items: [] };
				const serverGarage = this.server.garage.items.slice();
				const userGarageItems = this.user.garage;

				for (const garageItem of serverGarage) {
					const { category, id, modificationID, canBuy = true } = garageItem;
					const userGarageItem = userGarageItems?.[category]?.[id];
					const i18GarageItem = this.i18Garage[this.language]?.[id] ?? {
						name: id,
						description:
							"Notifique um administrador, tradução não encontrada\n\nNotify an admin, translation not found\n\nСообщить администратору, перевод не найден",
					};

					// Atribui os valores de name e description diretamente ao objeto garageItem
					garageItem.name = i18GarageItem.name;
					garageItem.description = i18GarageItem.description;

					// Se o usuário não possui esse item na garagem e ele pode ser comprado, adicione-o à lista de itens compráveis
					if (!userGarageItem) {
						if (canBuy) {
							buyableGarage.items.push(garageItem);
						}
						continue;
					}

					// Se o usuário possui o item na garagem, adicione-o à lista de itens na garagem do usuário
					if (
						modificationID === userGarageItem.m ||
						modificationID === undefined
					) {
						if (userGarageItem.count) {
							garageItem.count = userGarageItem.count;
						}
						userGarage.items.push(garageItem);
						continue;
					}

					// Se o usuário não possui o item na garagem e ele não pode ser comprado, ignore-o
					if (canBuy) {
						buyableGarage.items.push(garageItem);
					}
				}

				// Envia a garagem do usuário para o cliente
				this.sendPacket(-255516505, new ByteArray().writeObject(userGarage));

				// Equipa os itens da garagem que estavam salvos
				for (const category in this.user.garage) {
					const categoryData = this.user.garage[category];
					if (categoryData.equiped !== undefined) {
						var itemToEquip =
							categoryData.equiped +
							"_m" +
							Math.max(categoryData[categoryData.equiped].m, 0);
						this.sendPacket(
							2062201643,
							new ByteArray().writeUTF(itemToEquip).writeBoolean(true)
						);
					}
				}

				// Envia a lista de itens compráveis para o cliente
				this.sendPacket(-300370823, new ByteArray().writeObject(buyableGarage));

				this.changeLayout();
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
				this.user.battle.CodecStatistics();
				this.sendPacket(1953272681);
				this.user.battle.CodecBattleMineCC();
				this.user.battle.suppliesPanel();
				this.user.battle.newTank();
				this.user.battle.table();
				this.user.battle.effects();
				this.user.battle.objetoIndefinido();
				this.changeLayout();
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
			if (this.user.battle.isSpectator) {
				this.user.battle.spectatorMessage(message, teamOnly);
				return;
			}
			var _packet = new ByteArray();
			_packet.writeUTF(this.user.username);
			_packet.writeUTF(message);
			_packet.writeInt(2);
			if (message.startsWith("/")) {
				this.command.parse(message);
				return;
			}
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
			const position = packet.readInt();
			const value = packet.readUTF();
			logger.debug(
				`Conferindo se captcha está correta: \nValor esperado: ${this.captchaSolution}\nValor preenchido: ${value}`
			);
			if (value === this.captchaSolution) {
				logger.debug(`Captcha solucionada`);
				let _packet = new ByteArray().writeInt(position);
				this.sendPacket(-819536476, _packet);
			} else {
				logger.debug(`Captcha incorreta`);
				this.sendCaptchaImage(position, true);
			}
		} else if (packetID == PKG.RECOVER_ACCOUNT_BY_EMAIL) {
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
		} else if (packetID == PKG.OPEN_FRIENDS_PANEL) {
			this.sendPacket(-437587751);
		} else if (packetID == PKG.LOBBY_CHAT_SEND_MESSAGE) {
			this.lobbyChat.sendMessage(packet);
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
		} else if (packetID == PKG.TOGGLE_SHOW_DAMAGE) {
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
				this.garage.tryBuyThisItem({
					name,
					modification,
					quantity,
					value,
					item,
				});
			}
		} else if (packetID == PKG.LOBBY_REQUEST_BATTLE_LIST) {
			// PEDIR LISTA DE BATALHAS
			if (this.layout.front == 0) {
				this.lobby.removeBattleList();
				this.loadLayout({ layout: 3 });
				this.changeLayout();
				return;
			} else if (this.layout.front == 1) {
				this.sendPacket(1211186637); // REMOVER GARAGEM
				this.loadLayout({ layout: 0 });
				return;
			} else if (this.layout.front == 3) {
				this.loadLayout({ layout: 0, back: 3 });
				return;
			}
			// this.loadLayout({ layout: 0 });
		} else if (packetID == PKG.BATTE_SPECTATOR_JOIN) {
			if (!this.user.battle) {
				this.user.battle = new ProTankiBattle(this);
				this.user.battle.joinSpectator();
			}
		} else if (packetID == PKG.BATTLE_PING) {
			if (this.user.battle) {
				if (this.currentTime) {
					const doubleInt = new ByteArray();
					doubleInt.writeInt(new Date() - this.serverTime);
					doubleInt.writeInt(new Date() - this.currentTime);
					this.sendPacket(34068208, doubleInt);
				}
			}
			setTimeout(() => {
				this.sendPacket(-555602629);
				this.currentTime = new Date();
			}, 1000);
		} else if (packetID == -1376947245000000000) {
			this.removeLoading();
		} else if (packetID == 268832557) {
			this.user.battle.updateTankiData();
		} else if (packetID == PKG.BATTLE_JOIN) {
			const team = packet.readInt();
			if (!this.user.battle) {
				this.user.battle = new ProTankiBattle(this);
				this.user.battle.join(team);
			}
		} else if (packetID == 2074243318) {
			// VERIFY CLIENT AND SERVER MS
			const clientMS = packet.readInt();
			this.clientMS = clientMS;
			const serverMS = packet.readInt();

			console.log({ clientMS, serverMS });
		} else if (packetID == PKG.BATTLE_READY_TO_SPAWN) {
			this.user.battle.spawn();
		} else if (packetID == PKG.BATTLE_TURRENT_COMMAND) {
			packet.readInt();
			this.user.battle.angle = packet.readFloat();
			const control = packet.readByte();
			const incarnationId = packet.readShort();
			this.user.battle.control = control;
			const rotateTurretPacket = new ByteArray();
			rotateTurretPacket.writeUTF(this.user.username);
			rotateTurretPacket.writeFloat(this.user.battle.angle);
			rotateTurretPacket.writeByte(this.user.battle.control);
			this.user.battle.party.sendPacket(1927704181, rotateTurretPacket, this);
		} else if (packetID == PKG.BATTLE_CONTROL_COMMAND) {
			packet.readInt();
			const specificationId = packet.readShort();
			const control = packet.readByte();
			this.user.battle.control = control;

			const controlPacket = new ByteArray();
			controlPacket.writeUTF(this.user.username);
			controlPacket.writeByte(this.user.battle.control);
			this.user.battle.party.sendPacket(-301298508, controlPacket, this);
		} else if (packetID == PKG.BATTLE_MOVE_AND_TURRENT_COMMAND) {
			packet.readInt();
			packet.readShort(); // specificationId

			const nPacket = new ByteArray();
			nPacket.writeUTF(this.user.username);
			nPacket.write(packet.buffer);
			this.user.battle.party.sendPacket(1516578027, nPacket, this);

			let empty = packet.readBoolean(); // angularVelocity
			if (!empty) {
				this.user.battle.angularVelocity = {
					x: packet.readFloat(),
					y: packet.readFloat(),
					z: packet.readFloat(),
				};
			}

			this.user.battle.control = packet.readByte(); // control

			empty = packet.readBoolean(); // linearVelocity
			if (!empty) {
				this.user.battle.linearVelocity = {
					x: packet.readFloat(),
					y: packet.readFloat(),
					z: packet.readFloat(),
				};
			}

			empty = packet.readBoolean(); // orientation
			if (!empty) {
				this.user.battle.orientation = {
					x: packet.readFloat(),
					y: packet.readFloat(),
					z: packet.readFloat(),
				};
			}

			empty = packet.readBoolean(); // position
			if (!empty) {
				this.user.battle.position = {
					x: packet.readFloat(),
					y: packet.readFloat(),
					z: packet.readFloat(),
				};
			}

			this.user.battle.turretDirection = packet.readFloat();
		} else if (packetID == PKG.BATTLE_MOVE_COMMAND) {
			packet.readInt();
			packet.readShort(); // specificationId

			const nPacket = new ByteArray();
			nPacket.writeUTF(this.user.username);
			nPacket.write(packet.buffer);
			this.user.battle.party.sendPacket(-64696933, nPacket, this);

			let empty = packet.readBoolean(); // angularVelocity
			if (!empty) {
				this.user.battle.angularVelocity = {
					x: packet.readFloat(),
					y: packet.readFloat(),
					z: packet.readFloat(),
				};
			}

			this.user.battle.control = packet.readByte(); // control

			empty = packet.readBoolean(); // linearVelocity
			if (!empty) {
				this.user.battle.linearVelocity = {
					x: packet.readFloat(),
					y: packet.readFloat(),
					z: packet.readFloat(),
				};
			}

			empty = packet.readBoolean(); // orientation
			if (!empty) {
				this.user.battle.orientation = {
					x: packet.readFloat(),
					y: packet.readFloat(),
					z: packet.readFloat(),
				};
			}

			empty = packet.readBoolean(); // position
			if (!empty) {
				this.user.battle.position = {
					x: packet.readFloat(),
					y: packet.readFloat(),
					z: packet.readFloat(),
				};
			}
		} else if (packetID == PKG.BATTLE_READ_TO_ENABLE) {
			this.user.battle.enableTanki();
		} else if (packetID == PKG.BATTLE_RAILGUN_START) {
			// TIRO ELETRICO (1)
			const shooterPacket = new ByteArray();
			shooterPacket.writeUTF(this.user.username);
			this.user.battle.party.sendPacket(346830254, shooterPacket, this);
		} else if (packetID == PKG.BATTLE_RAILGUN_FINISH) {
			this.railgunHit(packet);
		} else if (packetID == PKG.BATTLE_LEAVE) {
			const layout = packet.readInt();
			this.user.battle.leave(layout);
			this.user.battle = null;
		} else if (packetID == -523392052) {
			// COMPRAR KIT
			const kitName = packet.readUTF();
			const kitPrice = packet.readInt();
			console.log({ kitName, kitPrice });
		} else if (packetID == 988664577) {
			const _packet = new ByteArray();
			_packet.writeUTF(this.user.username);
			_packet.writeInt(3000);

			setTimeout(() => {
				this.user?.battle?.party?.sendPacket(162656882, _packet);
				this.user.battle.state = "suicide";
				this.user.battle.state_null = true;
			}, 10 * 1000);
		} else if (packetID == -1047185003) {
			// REMOVER BONUS DO MAPA
			this.user.battle.party.sendPacket(-1291499147, packet);
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

	changeLayout() {
		var packet = new ByteArray();

		packet.writeInt(this.layout.back);
		packet.writeInt(this.layout.front);

		this.lobbyServer.removePlayer(this);
		this.garageServer.removePlayer(this);
		this.lobbyChatServer.removePlayer(this);
		this.battle = null;
		this.garage = null;

		switch (this.layout.front) {
			case 0:
				this.lobbyChatServer.addPlayer(this);
				this.lobbyServer.addPlayer(this);

				if (this.user.selectedBattle) {
					this.lobby.getBattleInfos(this.user.selectedBattle.id);
				}
				break;
			case 1:
				this.lobbyChatServer.addPlayer(this);
				this.garageServer.addPlayer(this);
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

		logger.verbose(
			`Mudando layout: ${this.layout.back} -> ${this.layout.front}`
		);

		this.sendPacket(-593368100, packet);
	}

	async requestUserInfos(username) {
		logger.debug(
			`${this.user.username} me pediu informações sobre o usuário: ${username}`
		);
		let _user = await this.ObtainUserByUsername(username);
		if (!_user.exist) return;

		//CodecOnlineNotifierData
		var _packet = new ByteArray();
		_packet.writeBoolean(_user.online); //online
		_packet.writeInt(this.server.id); //serverNumber
		_packet.writeUTF(_user.username); //userId
		this.sendPacket(2041598093, _packet);
		logger.debug(
			`CodecOnlineNotifierData do usário ${_user.username} foi enviado para o ${this.user.username}`
		);

		//CodecRankNotifierData
		var _packet_A = new ByteArray();
		_packet_A.writeInt(_user.rank); //rank
		_packet_A.writeUTF(_user.username); //userId
		this.sendPacket(-962759489, _packet_A);
		logger.debug(
			`CodecRankNotifierData do usário ${_user.username} foi enviado para o ${this.user.username}`
		);
		// SEI LA
		var _packet_B = new ByteArray();
		_packet_B.writeUTF(_user.username); //userId
		this.sendPacket(1941694508, _packet_B);
		logger.debug(
			`1941694508 do usário ${_user.username} foi enviado para o ${this.user.username}`
		);
		//CodecPremiumNotifierData
		var _packet_C = new ByteArray();
		_packet_A.writeInt(32989); //tempo em segundos
		_packet_C.writeUTF(_user.username); //userId
		this.sendPacket(-2069508071, _packet_C);
		logger.debug(
			`CodecPremiumNotifierData do usário ${_user.username} foi enviado para o ${this.user.username}`
		);
	}

	setLanguage(packet) {
		this.language = packet.readUTF();
		this.language =
			this.language === "pt_BR" ||
			this.language === "ru" ||
			this.language === "en"
				? this.language
				: "ru";
		if (this.language) {
			logger.verbose(`Novo acesso no idioma: ${this.language}`);

			this.setLoginSocialButtons();
			this.initCaptchaPositions();
			this.resources.loadByJSON(mainResources, 1);
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

	sendCaptchaImage(location, fromIncorrect = false) {
		var packet = new ByteArray();

		packet.writeInt(location); // captcha position id

		const _captcha = captcha();

		this.captchaSolution = _captcha.text;

		var img = new Buffer.from(_captcha.base64, "Base64");

		packet.writeInt(img.length);
		packet.write(img);

		if (fromIncorrect) {
			this.sendPacket(-373510957, packet);
			return;
		}

		this.sendPacket(-1670408519, packet);
	}

	loadLayout(objValues) {
		const { layout, chat, news, back } = objValues;

		this.layout = {
			front: layout,
			back: back ?? layout,
		};

		this.currentLayout = layout;
		logger.verbose(`Carregando layout: ${layout}`);

		var packet = new ByteArray();
		packet.writeInt(layout);
		this.sendPacket(1118835050, packet); // CONFIRM LAYOUT ACESSIBLE

		if (chat) {
			if (!this.lobbyChat) {
				this.lobbyChat = new ProTankiLobbyChat(this);
			}
			this.lobbyChat.configuration();
			this.lobbyChat.chatDelay();
			this.lobbyChat.obtainChatMessages();
		}

		if (news) {
			this.showNews();
		}

		if (layout == 0) {
			if (!this.lobby) {
				this.lobby = new ProTankiLobby(this);
			}
			this.lobby.mapsList();
			this.lobby.battleList();
			this.changeLayout();
		} else if (layout == 1) {
			this.sendPacket(-324155151);

			const resources = [
				613847, 882260, 603366, 762221, 387779, 651066, 825544, 592136, 379077,
				43761, 608063, 508353, 553103, 103660, 686147, 595904, 705554, 882259,
				603365, 762220, 387778, 896849, 216993, 807842, 677721, 205433, 282433,
				770995, 875152, 412745, 412747, 412749, 412751, 262762, 581830, 926940,
				918917, 86316, 9428, 67785, 9711, 507813, 581114, 810956, 772221,
				209093, 930954, 725126, 72508, 629496, 265425, 67263, 923853, 209092,
				930953, 725125, 72507, 826132, 289133, 271579, 630759, 904690, 486892,
				55428, 64819, 730749, 500013, 914016, 832320, 882375, 511249, 372034,
				185908, 542698, 906451, 905090, 385917, 388968, 388967, 910936, 971083,
				123597, 123598, 123566, 123567, 123568, 123569, 123570, 123571, 123572,
				123574, 123575, 123576, 123577, 123578, 123579, 123580, 123581, 123582,
				123583, 123584, 123585, 123586, 123587, 123588, 123589, 123590, 123591,
				123592, 123593, 123594, 123595, 123596, 471061, 350240, 468704, 912977,
				456516, 95646, 682329, 300293, 769778, 123601, 981027, 246572, 201158,
				107643, 829177, 564917, 364130, 865963, 968399, 123600, 92554, 985440,
				254675, 344971, 123604, 5343, 277983, 112041, 201886, 46357, 388701,
				600886, 739321, 123599, 332230, 327089, 964904, 49564, 167323, 379571,
				184125, 791701, 648950, 123565, 669820, 123602, 645131, 494974, 16227,
				186119, 123603, 700822, 184733, 123605, 866855, 337676, 235659, 148905,
				157268, 378710, 321516, 645743, 213222, 876546, 476463, 345344, 124521,
				415252, 856855, 633256, 971085, 148906, 345346, 345345, 643246, 643245,
				272402, 875490, 102099, 580104, 417664, 390894, 922189, 783992, 922542,
				892482, 184586, 419174, 252605, 752370, 188269, 566195, 355510, 30158,
				291770, 836341, 458866, 620162, 846169, 482389, 743352, 431685, 587952,
				482387, 482390, 482391, 348673, 486103, 482393, 149964, 494235, 702421,
				482392, 482394, 254380, 482395, 533887, 677607, 703411, 841306, 525234,
				511823, 195900, 765374, 333579, 482396, 428601, 671068, 962041, 803390,
				482397, 310874, 33331, 482398, 353894, 175184, 977110, 855481, 19784,
				482399, 758173, 807884, 482400, 482401, 524803, 521658, 739955, 672648,
				288940, 969240, 390649, 393067, 482402, 426788, 583689, 297237, 95492,
				131017, 511824, 884861, 855523, 396547, 834458, 900943, 658830, 234018,
				135239, 749551, 405746, 490205, 660966, 482403, 482404, 289461, 243929,
				84693, 714942, 25966, 80128, 187001, 187002, 187003, 186998, 186999,
				187000, 765745, 765746, 765748, 765747, 765743, 533226, 423422, 51287,
				602359, 326343, 700690, 470883, 149381, 994995, 747941, 156789, 227313,
				837531, 871359, 765744, 186997, 524516, 789404, 45309, 122218, 868053,
				784942, 749669, 978053, 524809, 100096, 212942, 416096, 100527, 348039,
				387176, 395966, 133241, 187107, 136056, 408662, 846623, 817175, 890775,
				817171, 248829, 891798, 796471, 674687, 817162, 531101, 650392, 353567,
				389934, 817167, 215066, 817163, 239833, 687487, 126433, 617155, 817168,
				226368, 817169, 150010, 817165, 34073, 527428, 997998, 171873, 686233,
				852231, 643659, 268558, 254796, 817170, 397117, 817173, 227538, 817174,
				864803, 357931, 475042, 915892, 800215, 817177, 499689, 802465, 654396,
				965911, 817161, 817166, 360111, 660670, 817164, 673110, 20255, 634104,
				842400, 811482, 727483, 465714, 910731, 817172, 641622, 662139, 138495,
				384066, 687486, 239194, 817176, 478398, 89108, 208105, 288506, 66990,
				243557, 322006, 480054, 542199, 759852, 156904, 652351, 401654, 489242,
				195617, 15895, 114450, 528275, 252505, 452333, 684358, 42973, 683948,
				452335, 334541, 487144, 683952, 368261, 380858, 683947, 452334, 482522,
				533224, 452336, 452338, 80750, 851011, 683951, 683950, 825562, 641749,
				683949, 166230, 432233, 452337, 661713, 73360, 683946, 319554, 443119,
				107132, 558183, 205377, 474775,
			];

			this.resources.loadByListOfIds(resources, 3);
		}

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
			let _user = this.reloadClassFile("/ProTankiUser.js", client);
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
			let _user = this.reloadClassFile("/ProTankiUser.js", client);
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
		if (this.layout.front != 1) {
			if (this.user.battle) {
				this.loadLayout({ layout: 1, back: 3 });
			} else {
				this.loadLayout({ layout: 1 });
			}
		} else {
			this.sendPacket(1211186637); // REMOVER GARAGEM
			this.loadLayout({ layout: 3 });
			this.changeLayout();
		}
	}

	/**
	 * Returns the `date` formatted in YYYY-MM-DD.
	 *
	 * @param {Date} date
	 *
	 * @returns {String}
	 */
	dateFormat(date) {
		if (!(date instanceof Date)) {
			console.error(
				"Recebido uma data inválida então substituido por 00/00/00"
			);
			return "00/00/00";
		}

		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");

		return `${day}/${month}/${year}`;
	}

	/**
	 * Exibe as notícias para o cliente.
	 */
	async showNews() {
		const newsListDB = this.server.newsList;
		const newsList = [];
		for (let index = 0; index < newsListDB.length; index++) {
			const element = newsListDB[index];
			if (element.id > this.user.news) {
				this.user.news = element.id;
				newsList.push([
					element.image,
					this.dateFormat(element.createdAt),
					element.content,
				]);
			}
		}

		if (newsList.length > 0) {
			setUserNewsID(this.user.news, this.user.uid);
			const packet = new ByteArray();

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
	}

	async railgunHit(packet) {
		const ms = packet.readInt();
		const targets = [];
		const incarnations = [];
		const staticHitPoint = {};
		const targetHitPoints = [];
		const _targetHitPoints = [];
		const __targetHitPoints = [];

		let empty = packet.readBoolean();
		if (!empty) {
			staticHitPoint.x = packet.readFloat();
			staticHitPoint.y = packet.readFloat();
			staticHitPoint.z = packet.readFloat();
		}

		empty = packet.readBoolean();
		if (!empty) {
			const userCount = packet.readInt();
			for (let i = 0; i < userCount; i++) {
				let user = await this.ObtainUserByUsername(packet.readUTF());
				targets.push(user);
			}
		}

		empty = packet.readBoolean();
		if (!empty) {
			const targetHitPointsLen = packet.readInt();
			for (let i = 0; i < targetHitPointsLen; i++) {
				empty = packet.readBoolean();
				if (!empty) {
					const targetHitPoint = {};
					targetHitPoint.x = packet.readFloat();
					targetHitPoint.y = packet.readFloat();
					targetHitPoint.z = packet.readFloat();
					targetHitPoints.push(targetHitPoint);
				}
			}
		}

		empty = packet.readBoolean();
		if (!empty) {
			const incarnationsLen = packet.readInt();
			for (let i = 0; i < incarnationsLen; i++) {
				incarnations.push(packet.readShort());
			}
		}

		empty = packet.readBoolean();
		if (!empty) {
			const _targetHitPointsLen = packet.readInt();
			for (let i = 0; i < _targetHitPointsLen; i++) {
				empty = packet.readBoolean();
				if (!empty) {
					const _targetHitPoint = {};
					_targetHitPoint.x = packet.readFloat();
					_targetHitPoint.y = packet.readFloat();
					_targetHitPoint.z = packet.readFloat();
					_targetHitPoints.push(_targetHitPoint);
				}
			}
		}

		empty = packet.readBoolean();
		if (!empty) {
			const __targetHitPointsLen = packet.readInt();
			for (let i = 0; i < __targetHitPointsLen; i++) {
				empty = packet.readBoolean();
				if (!empty) {
					const __targetHitPoint = {};
					__targetHitPoint.x = packet.readFloat();
					__targetHitPoint.y = packet.readFloat();
					__targetHitPoint.z = packet.readFloat();
					__targetHitPoints.push(__targetHitPoint);
				}
			}
		}

		const _packet = new ByteArray();
		_packet.writeUTF(this.user.username);

		if (Object.keys(staticHitPoint).length > 0) {
			console.log(staticHitPoint);
			_packet.writeBoolean(false);
			_packet.writeFloat(staticHitPoint.x);
			_packet.writeFloat(staticHitPoint.y);
			_packet.writeFloat(staticHitPoint.z);
		} else {
			_packet.writeBoolean(true);
		}

		if (targets.length > 0) {
			_packet.writeBoolean(false);
			_packet.writeInt(targets.length);
			targets.forEach((target) => {
				_packet.writeUTF(target.username);
			});
		} else {
			_packet.writeBoolean(true);
		}

		if (targetHitPoints.length > 0) {
			_packet.writeBoolean(false);
			_packet.writeInt(targetHitPoints.length);
			targetHitPoints.forEach((targetHitPoint) => {
				_packet.writeBoolean(false);
				_packet.writeFloat(targetHitPoint.x);
				_packet.writeFloat(targetHitPoint.y);
				_packet.writeFloat(targetHitPoint.z);
			});
		} else {
			_packet.writeBoolean(true);
		}

		// console.log({
		// 	targets,
		// 	shorts,
		// 	staticHitPoint,
		// 	targetHitPoints,
		// 	_targetHitPoints,
		// 	__targetHitPoints,
		// });

		this.user.battle.party.sendPacket(-369590613, _packet, true);

		this.user.battle.damage(targets);
	}
}

module.exports = ProTankiClient;
