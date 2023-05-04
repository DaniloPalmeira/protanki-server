// Importação da classe ByteArray
const ProTankiBattleServer = require("../server/ProTankiBattle");
// Importação da classe ByteArray
const ByteArray = require("../ByteArray");
// Importação do objeto PKG
const PKG = require("../../helpers/pkg.json");
const logger = require("../../helpers/logger");

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

	fixBattleName(packet) {
		const battleName = packet.readUTF();

		const _packet = new ByteArray();

		_packet.writeUTF(battleName);

		this.sendPacket(PKG.LOBBY_FIX_BATTLE_NAME, _packet);
	}

	removeChat() {
		this.sendPacket(PKG.LOBBY_REMOVE_CHAT);
	}

	removeBattleList() {
		this.sendPacket(PKG.LOBBY_REMOVE_BATTLE_LIST);
	}

	createBattle(packet) {
		var bData = {};

		bData.autoBalance = packet.readBoolean();
		bData.mode = packet.readInt(); // 0 = DM	// 1 = TDM	// 2 = CTF	// 3 = CP	// 4 = AS
		bData.equip = packet.readInt(); // 0 NONE; // 1 HORNET_RAILGUN; // 2 WASP_RAILGUN; // 3 HORNET_WASP_RAILGUN;
		bData.friendlyFire = packet.readBoolean();
		bData.scoreLimit = packet.readInt();
		bData.timeLimitInSec = packet.readInt();
		bData.map = packet.readUTF();
		// bData.mapId = packet.readUTF();

		bData.maxPeople = packet.readInt();
		// bData.maxPeopleCount = packet.readInt();
		bData.name = packet.readUTF();
		bData.parkour = packet.readBoolean();
		bData.private = packet.readBoolean();
		bData.pro = packet.readBoolean();
		bData.maxRank = packet.readInt();
		bData.minRank = packet.readInt();
		bData.reArmorEnabled = packet.readBoolean();
		if (!bData.pro) {
			bData.reArmorEnabled = true;
		}
		bData.theme = packet.readInt(); // 0 = SUMMER; // 1 = WINTER; // 2 = SPACE; // 3 = SUMMER_DAY; // 4 = SUMMER_NIGHT; // 5 = WINTER_DAY;
		bData.withoutBonuses = packet.readBoolean();
		bData.withoutCrystals = packet.readBoolean();
		bData.withoutSupplies = packet.readBoolean();
		bData.withoutUpgrades = packet.readBoolean();
		bData.id = this.client.server.randomID(16);

		const nBattle = new ProTankiBattleServer({
			...bData,
			server: this.client.server,
			owner: this.client.user.username,
		});

		if (nBattle.valid) {
			this.client.server.battleList[bData.id] = nBattle;

			var _packet = new ByteArray();

			_packet.writeObject(this.client.server.battleList[bData.id].new);

			this.client.lobbyServer.sendPacket(PKG.LOBBY_SEND_CREATE_BATTLE, _packet);
			this.getBattleInfos(bData.id);

			// this.sendPacket(-1491503394); // AVISO QUE ESTÁ BANIDO E NÃO PODE CRIAR BATALHA
		}
	}

	/**
	 * Obtém as informações de uma batalha específica e envia para o cliente.
	 * @param {string|ByteArray} packet - O pacote contendo o ID da batalha.
	 */
	getBattleInfos(packet) {
		let battleId;

		// Verifica o tipo do pacote para obter o ID da batalha
		if (typeof packet === "string") {
			battleId = packet;
		} else {
			battleId = packet.readUTF();
		}

		logger.verbose(`Obter visualização da batalha: ${battleId}`);

		// Verifica se o ID da batalha está presente na lista de batalhas do servidor
		if (!(battleId in this.client.server.battleList)) {
			console.log(battleId);
			return;
		}

		// Obtém a referência para a batalha a partir do ID da batalha
		const battle = this.client.server.battleList[battleId];

		// Adiciona o cliente como visualizador na batalha
		battle.addViewer(this.client);

		// Remove o cliente de uma possível batalha anteriormente selecionada
		if (this.client.user.selectedBattle) {
			this.client.user.selectedBattle.removeViewer(this.client);
		}

		// Define a batalha atualmente selecionada para o cliente
		this.client.user.selectedBattle = battle;

		// Cria um novo ByteArray para o pacote de resposta
		const battlePacket = new ByteArray();

		// Monta as informações da batalha no pacote de resposta em formato JSON
		const battleInfos = {
			...battle.show,
			spectator: this.client.user.spectator,
			userPaidNoSuppliesBattle: false,
		};

		// Verifica se o usuário é o proprietário da batalha ou possui propass
		// para definir a flag userPaidNoSuppliesBattle como verdadeira
		if (
			battle.owner === this.client.user.username ||
			this.client.user.propass
		) {
			battleInfos.userPaidNoSuppliesBattle = true;
		}

		// Escreve as informações da batalha no pacote de resposta
		battlePacket.writeObject(battleInfos);

		// Envia o pacote de resposta para o cliente
		this.sendPacket(546722394, battlePacket);
	}

	/**
	Obtém a lista de batalhas disponíveis a partir do objeto "client.server.battleList" e envia como um pacote de dados para o cliente conectado.
	*/
	battleList() {
		// Cria um novo objeto ByteArray
		const packet = new ByteArray();

		// Cria um novo objeto jObject com um array vazio "battles"
		const jObject = {
			battles: [],
		};

		// Itera sobre cada batalha na lista de batalhas disponíveis
		// e adiciona suas informações ao array "battles" do objeto jObject
		for (const battle of Object.values(this.client.server.battleList)) {
			jObject.battles.push(battle.battleToList);
		}

		// Escreve o objeto jObject no pacote de dados
		packet.writeObject(jObject);

		// Envia o pacote de dados para o cliente conectado com o ID do pacote 552006706
		this.sendPacket(552006706, packet);
	}

	/**
	 * Carrega a lista de mapas disponíveis no servidor e envia como um pacote de dados para o cliente conectado.
	 */
	mapsList() {
		// Cria um novo objeto ByteArray
		const packet = new ByteArray();

		// Cria um objeto "json" com informações sobre a lista de mapas
		const json = {
			maxRangeLength: this.client.user.privLevel == 0 ? 10 : 30, // define o tamanho máximo da lista de mapas com base no nível de privilégio do usuário
			battleCreationDisabled:
				this.client.user.rank == 1 && !this.client.user.privLevel, // define se a criação de batalhas está desabilitada com base no nível de privilégio do usuário e sua posição no ranking
			battleLimits: [
				{ battleMode: "DM", scoreLimit: 999, timeLimitInSec: 59940 },
				{ battleMode: "TDM", scoreLimit: 999, timeLimitInSec: 59940 },
				{ battleMode: "CTF", scoreLimit: 999, timeLimitInSec: 59940 },
				{ battleMode: "CP", scoreLimit: 999, timeLimitInSec: 59940 },
				{ battleMode: "AS", scoreLimit: 999, timeLimitInSec: 59940 },
			], // define os limites de pontuação e tempo para cada modo de batalha disponível
			maps: this.client.server.maps.map((item) => {
				if (this.client.user.privLevel != 0) {
					// se o usuário tiver um nível de privilégio diferente de 0, habilita todos os mapas e define o rank mínimo como 1
					item.minRank = 1;
					item.enabled = true;
				} else if (this.client.user.rank == 1) {
					// se o usuário tiver um rank igual a 1, desabilita todos os mapas
					item.enabled = false;
				}
				item.mapName =
					this.client.server.mapsNames[this.client.language]?.[item.mapId] ??
					`Unnamed - ${item.mapId}`;
				delete item.props;
				return item;
			}),
		};

		// Converte o objeto "json" em uma string JSON e a escreve no objeto "packet"
		packet.writeObject(json);

		// Envia o pacote de dados para o cliente conectado com o ID do pacote -838186985
		this.sendPacket(-838186985, packet);
	}
};
