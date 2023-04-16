const initClientFuncions = require("../functions/initClientFunctions");
const ByteArray = require("./ByteArray");
const ProTankiUser = require("./client/ProTankiUser");
const { getUserByEmail } = require("../helpers/db");
const ProTankiRegister = require("./client/ProTankiRegister");
const ProTankiLogin = require("./client/ProTankiLogin");
const PKG = require("../modules/pkg.json");

class ProTankiClient {
	language = "ru";

	decrypt_position = 0;
	encrypt_position = 0;

	encryptionLenght = 8;
	decrypt_keys = new Array(8);
	encrypt_keys = new Array(8);

	constructor(data) {
		Object.assign(this, data);
		initClientFuncions.call(this);

		this.rawDataReceived = new ByteArray(Buffer.alloc(0));

		console.log("Nova conexão pelo IP:", this.socket.remoteAddress);

		this.socket.on("data", (data) => this.onDataReceived(data));
		this.socket.on("close", () => this.onConnectionClose());

		this.server.addClient(this);
		this.gerateCryptKeys();

		this.user = new ProTankiUser();
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
		// console.log(packetID);

		this.decryptPacket(packet);

		if (packetID == PKG.SET_LANGUAGE) {
			this.setLanguage(packet);
		} else if (packetID == PKG.AUTOLOGIN_BY_HASH) {
			console.log("HASH", packet.readUTF());
		} else if (packetID == -82304134) {
			var callback = packet.readInt();
			if (callback == 1) {
				this.setInviteState();
				this.initLoginPage();
				this.removeLoading();
			} else if (callback == 2) {
				this.changeLayout(0, 0);
				this.initArchivaments();
				this.showNews();
				this.initChatConfiguration();
				this.setChatDelay();
				this.loadChatMessages();
				// this.addPlayerInBattle()
				this.loadMapsList();
				this.loadBattleList();
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
					new ByteArray().writeUTF(JSON.stringify(jsonGarageUser))
				);

				// EQUIPAR ITENS DA GARAGEM (Q ESTAVAM SALVOS)
				for (const key in this.user.garage) {
					console.log(key);
					const cat = this.user.garage[key];
					console.log(cat.equiped);
					if (cat.equiped != undefined) {
						var itemToEquip =
							cat.equiped +
							"_m" +
							(cat[cat.equiped].m >= 0 ? cat[cat.equiped].m : 0);
						console.log(itemToEquip);
						this.sendPacket(
							2062201643,
							new ByteArray().writeUTF(itemToEquip).writeBoolean(true)
						);
					}
				}

				this.sendPacket(
					-300370823,
					new ByteArray().writeUTF(JSON.stringify(jsonGarageToBuy))
				);

				this.changeLayout(1, 1);
			} else {
				console.log("calback", callback);
			}
		} else if (packetID == 945463181) {
			var message = packet.readUTF();
			var anyBol = packet.readBoolean();
			var _packet = new ByteArray();
			_packet.writeUTF(this.user.username);
			_packet.writeUTF(message);
			_packet.writeInt(2);
			this.sendPacket(1259981343, _packet);
		} else if (packetID == PKG.REQUEST_CAPTCHA) {
			this.requestCaptcha(packet);
		} else if (packetID == PKG.REGISTER_VERIFY_USERNAME) {
			this.register.verifyUsername(packet);
		} else if (packetID == PKG.REGISTER_NEW_USER) {
			this.register.newUser(packet);
		} else if (packetID == PKG.LOGIN_CHECK_CREDENTIALS) {
			this.login.checkCredentials(packet);
		} else if (packetID == 1271163230) {
			// VERIFICAR CAPTCHA (RECUPERAÇAO DE SENHA)
			let _packet = new ByteArray().writeInt(3);
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
		} else if (packetID == 903498755) {
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

				this.sendChatMessages([mensagem]);
			}.call(this));
		} else if (packetID == PKG.LOBBY_BATTLE_INFOS) {
			this.getBattleInfos(packet);
		} else if (packetID == 1227293080) {
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
		} else if (packetID == 326032325) {
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
			const SocialNetworkPanel = new ByteArray();
			SocialNetworkPanel.writeBoolean(true);
			SocialNetworkPanel.writeInt(1); // LINKS
			SocialNetworkPanel.writeUTF(
				"https://oauth.vk.com/authorize?client_id=7889475&response_type=code&display=page&redirect_uri=http://146.59.110.195:8090/externalEntrance/vkontakte/?session=2628617444119693439"
			); // authorizationUrl
			SocialNetworkPanel.writeBoolean(false); // linkExists // plataforma vinculada
			SocialNetworkPanel.writeUTF("vkontakte"); // snId
			this.sendPacket(-583564465, SocialNetworkPanel);

			const notificationEnabled = new ByteArray();
			notificationEnabled.writeBoolean(true);
			this.sendPacket(1447082276, notificationEnabled);
		} else if (packetID == PKG.LOBBY_SET_BATTLE_NAME) {
			// DEFINIR O NOME DA BATALHA
			this.setBattleName(packet);
		} else if (packetID == PKG.LOBBY_CREATE_BATTLE) {
			// CRIAR BATALHA
			this.createBattle(packet);
		} else if (packetID == PKG.LOBBY_OPEN_GARAGE) {
			// ABRIR GARAGEM
			this.openGarage();
		} else if (packetID == 126880779) {
			// PESQUISAR NOME PARA ADICIONAR AMIGO
			let username = packet.readUTF();
			this.searchUserToAdd(username);
		} else if (packetID == -1457773660) {
			// ENVIAR SOLICITAÇÃO DE AMIZADE
			let username = packet.readUTF();
			this.sendFriendRequest(username);
		} else if (packetID == 84050355) {
			// REMOVER SOLICITAÇÃO DE AMIZADE
			let username = packet.readUTF();
			this.cancelFriendRequestSend(username);
		} else if (packetID == -1041660861) {
			// REMOVER NOTIFICAÇÃO DE SOLICITAÇOES DE AMIZADE NOVAS
			this.user.clearfriendsIncomingNew();
			this.sendPacket(-1041660861, packet);
		} else if (packetID == -1926185291) {
			// ACEITAR SOLICITAÇÃO DE AMIZADE
			let username = packet.readUTF();
			this.acceptedFriendRequestFrom(username);
		} else if (packetID == -1588006900) {
			// RECUSAR SOLICITAÇÃO DE AMIZADE
			let username = packet.readUTF();
			this.refusedFriendRequestFrom(username);
		} else if (packetID == 1286861380) {
			// REMOVER NOTIFICAÇÃO DE SOLICITAÇOES DE AMIZADE ACEITAS
			this.user.clearfriendsAcceptedNew();
			this.sendPacket(1286861380, packet);
		} else if (packetID == 1774907609) {
			var username = packet.readUTF();
			this.requestUserInfos(username);
		} else if (packetID == 1091756732) {
			// PREVIEW DE PINTURA
			var item = packet.readUTF();
			if (item) {
				this.sendPacket(
					2062201643,
					new ByteArray().writeUTF(item).writeBoolean(true)
				);
			}
		} else if (packetID == -1505530736) {
			// EQUIPAR ITEM NA GARAGEM
			var name = null;
			var modification = 0;
			var item = packet.readUTF();
			if (item) {
				name = item.split("_m")[0];
				modification = parseInt(item.split("_m")[1]);
				var equipItem = this.EquipItemInGarage({ item, name, modification });
				if (equipItem) {
					this.sendPacket(
						2062201643,
						new ByteArray().writeUTF(item).writeBoolean(true)
					);
				}
			}
		} else if (packetID == -1961983005) {
			// COMPRAR ITEM NA GARAGEM
			var item = packet.readUTF();
			if (item) {
				var name = item.split("_m")[0];
				var modification = parseInt(item.split("_m")[1]);
				var quantity = packet.readInt();
				var value = packet.readInt();
				var canBuy = this.TryBuyThisItem({
					name,
					modification,
					quantity,
					value,
					item,
				});
				console.log("packet", packet);
				console.log(item, quantity, value);
				// console.log(this.user.garage);
			}
		} else if (packetID == 1452181070) {
			// PEDIR LISTA DE BATALHAS
			this.loadLayout(0);
			this.sendPacket(1211186637); // REMOVER GARAGEM
			this.changeLayout(0, 0);
			this.loadMapsList();
			this.loadBattleList();
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

	async searchUserToAdd(username) {
		let _user = await this.ObtainUserByUsername(username);
		if (_user != undefined && this.user.username != _user.username) {
			this.sendPacket(-707501253);
		} else {
			this.sendPacket(-1490761936);
		}
	}

	async sendFriendRequest(username) {
		let _user = await this.ObtainUserByUsername(username);
		if (_user != undefined && this.user.username != _user.username) {
			this.user.friendRequestSend(_user.uid);
			_user.friendRequestRecv(this.user.uid);
			let _packet = new ByteArray();
			_packet.writeUTF(_user.username);
			this.sendPacket(-1241704092, _packet);
		}
	}

	async cancelFriendRequestSend(username) {
		let _user = await this.ObtainUserByUsername(username);
		if (_user) {
			this.user.cancelFriendRequestSend(_user.uid);
			_user.cancelFriendRequestRecv(this.user.uid);
		}
	}

	async acceptedFriendRequestFrom(username) {
		let _user = await this.ObtainUserByUsername(username);
		if (_user) {
			this.user.acceptedFriendRequestRecv(_user.uid);
			_user.acceptedFriendRequestSend(this.user.uid);
		}

		this.sendPacket(-139645601, new ByteArray().writeUTF(_user.username));
	}

	async refusedFriendRequestFrom(username) {
		let _user = await this.ObtainUserByUsername(username);
		if (_user) {
			this.user.cancelFriendRequestRecv(_user.uid);
			_user.cancelFriendRequestSend(this.user.uid);
		}
	}

	changeLayout(origin, state) {
		var packet = new ByteArray();

		packet.writeInt(origin);
		packet.writeInt(state);

		this.lobby.removePlayer(this);
		this.garage.removePlayer(this);
		this.lobbyChat.removePlayer(this);

		switch (state) {
			case 0:
				this.lobby.addPlayer(this);
				this.lobbyChat.addPlayer(this);
				break;
			case 1:
				this.garage.addPlayer(this);
				this.lobbyChat.addPlayer(this);
				break;
			default:
				break;
		}

		// 0 = battle_select
		// 1 = garage
		// 2 = payment
		// 3 = battle
		// 4 = reload_space

		this.sendPacket(-593368100, packet);
	}

	async requestUserInfos(username) {
		console.log(username);
		let _user = await this.ObtainUserByUsername(username);
		console.log(_user);
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
		this.sendPacket(1941694508, _packet_C);
	}

	setLanguage(packet) {
		this.language = packet.readUTF();
		if (this.language) {
			console.log("Novo acesso no idioma", this.language);

			this.setLoginSocialButtons();
			this.initCaptchaPositions();
			this.initResources(
				[
					343233, 343122, 790554, 432322, 523534, 124221, 123444, 143111,
					490113, 321232, 158174, 106777, 342637, 925137, 523632, 975465,
					895671, 962237, 965737, 545261, 389057, 965887, 175648, 1000065,
					1000076, 1000077, 110001, 110002, 785656, 785657, 785658, 785659,
					110004, 110005, 110006, 170001, 170004, 170005, 170006, 170007,
					170008, 170014, 170009, 170010, 170011, 170012, 170013, 584394,
					584396, 584398, 667431, 223994, 223995, 223996, 223997, 898926,
					700620, 292255, 142378, 228333, 97860, 236695, 828576, 179480, 457612,
					433995, 756745, 756746, 756747, 756748, 756749, 423332, 234233,
					756750, 756751, 114424, 468379, 932241, 670581, 963502, 966691,
					900596, 882103, 212409, 550305, 731304, 461967, 810405, 810406,
					810407, 810408, 44573, 689821, 842049, 95981, 454272, 342454, 416395,
					294478, 153545, 315290, 339826, 213432, 575434, 213443, 686923,
					970970, 870536, 75337, 600555, 938575, 500334, 632224, 242699, 386284,
					226985, 75329, 122842, 538453, 236578, 44351, 500060, 717912, 694498,
					89214, 525427, 150231, 102373, 915688, 560829, 546583, 982573, 298097,
					992320, 474249, 199168, 217165, 370093, 240260, 567101, 832304,
					345377, 730634, 930495, 650249, 752472, 679479, 752002, 450080,
					644720, 839177, 878808, 269321, 262233, 373285, 435325, 435326,
					435327, 435328, 337970, 215691, 906431, 948382, 824172, 71622, 716565,
					504645, 153186, 580106, 931026, 6338, 890676, 802804, 916624, 682348,
					46049, 907343, 916625, 682349, 46050, 907344, 227169, 377977, 271004,
					257012, 139472, 219122, 550964, 165165, 819540, 385322, 175994,
					142350, 513347, 347843, 153457, 937522, 160287, 557817, 653204, 20647,
					521900, 18283, 456708, 758687, 791739, 679592, 115070, 388185, 638066,
					332851, 77397, 999935, 906685, 369990, 73852, 839339, 906686, 369991,
					73853, 839340, 833050, 544500, 263824, 482110, 740019, 431730, 65798,
					933781, 205731, 31170, 458970, 768112, 503709, 15411, 104552, 551825,
					495014, 132033, 875465, 499715, 412744, 412746, 412748, 412750,
					423232, 234324, 567446, 342553, 257437, 747654, 321333, 23301, 23302,
					119320, 507538, 821478, 90740, 931624, 976299, 98644, 739386, 438964,
					141405, 967180, 82151, 444408, 386784, 192378, 858789, 448000, 817810,
					554337, 966681, 966682, 140028, 423333, 423334, 523562, 633226,
					623464, 123521, 867867, 867868, 867869, 200304, 493495, 931954,
					746058, 952497, 498645, 560996, 53082, 662824, 523797, 542023, 216783,
					104412, 906593, 703442, 78411, 704601, 529101, 473605, 929509, 60284,
					258487, 519187, 299478, 378667, 265602, 172172, 48688, 32379, 689436,
					868766, 996274, 285466, 412123, 312222, 412124, 412125, 412126,
					412127, 412128, 412129, 412130, 412131, 412132, 412133, 412134,
					412135, 412136, 412137, 412138, 412140, 412141, 412142, 412143,
					412144, 412145, 412146, 412147, 412148, 412149, 412150, 412151,
					412152, 412153, 412154, 412155, 412156, 412157, 412158, 412159,
					412160, 412161, 412162, 412163, 123333, 123334, 123335, 123336,
					412321, 412322, 123337, 234523, 123338, 123339, 123340, 123349,
					123350, 123351, 123341, 123342, 123343, 123344, 123345, 123346,
					123347, 123348,
				],
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

		packet.writeBoolean(this.server.canInvite);

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

	initResource(resource) {
		var packet = new ByteArray();

		packet.writeInt(resource);

		this.sendPacket(834877801, packet);
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

	async ObtainUserByUsername(username, forceUpdate = false) {
		if (!(username in this.server.users) || forceUpdate) {
			let _user = new ProTankiUser();
			await _user.loadByUsername(username);
			if (_user.exist) {
				this.server.users[username] = _user;
			}
		}
		return this.server.users[username];
	}

	async ObtainUserByUser(_userObj, forceUpdate = false) {
		if (!(_userObj.username in this.server.users) || forceUpdate) {
			let _user = new ProTankiUser();
			await _user.loadByUser(_userObj);
			if (_user.exist) {
				this.server.users[_userObj.username] = _user;
			}
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

		this.initResources(resources, 3);
	}
}

module.exports = ProTankiClient;
