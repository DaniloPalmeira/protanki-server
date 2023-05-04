const ByteArray = require("../ByteArray");
const { getUserById } = require("../../helpers/db");

module.exports = class {
	constructor(client) {
		this.client = client;
	}

	// FUNÇÕES SINCRONAS
	sendPacket(packetID, packet = new ByteArray()) {
		this.client.sendPacket(packetID, packet);
	}

	/**
	 * Verifica se o item pode ser equipado pelo usuário.
	 * @async
	 * @param {Object} item - Objeto contendo o nome e o nível de modificação do item.
	 * @returns {boolean} boolean - Indica se o item pode ser equipado ou não.
	 */
	async canEquipItem(item) {
		const { client } = this;
		const { garage } = client.user;

		// Verifica se o item está presente em algum slot do garage do usuário.
		for (const key in garage) {
			if (item.name in garage[key]) {
				const currentItem = garage[key][item.name];

				// Verifica se o nível de modificação do item é igual ao nível de modificação do item já presente na garagem do usuário
				// ou se o item não tem modificação.
				if (
					currentItem.m === item.modification ||
					currentItem.m === undefined
				) {
					// Atualiza a propriedade equiped do item na garagem do usuário.
					garage[key].equiped = item.name;
					// Chama a função updateGarage() do cliente para atualizar a garagem.
					client.user.updateGarage();
					// Retorna true indicando que o item pode ser equipado.
					return true;
				}
			}
		}
		// Se o item não puder ser equipado, retorna false.
		return false;
	}

	/**
	 * Equipa o item enviado pelo cliente.
	 * @param {ByteArray} packet - Pacote contendo o nome e o nível de modificação do item.
	 */
	equipItem(packet) {
		const itemString = packet.readUTF();
		if (!itemString) return;

		const [itemName, modification] = itemString.split("_m");
		const item = { name: itemName, modification: parseInt(modification) || 0 };

		// Verifica se o item pode ser equipado.
		const canEquip = this.canEquipItem(item);
		if (canEquip) {
			// Se o item puder ser equipado, envia um pacote de confirmação para o cliente.
			const equipPacket = new ByteArray()
				.writeUTF(itemString)
				.writeBoolean(true);
			this.sendPacket(2062201643, equipPacket);
		}
	}

	// async getItemByIdAndModification(itemName, modification) {
	// 	for (const key in this.client.user.garage) {
	// 		if (this.client.user.garage[key][itemName] != undefined) {
	// 			if (key == "weapon" || key == "armor") {
	// 				return modification + 1;
	// 			}
	// 			break;
	// 		}
	// 	}
	// 	return modification;
	// }

	async tryBuyThisItem(item) {
		const garage = this.client.user.garage;
		const itemFound = Object.keys(garage).find(
			(key) =>
				garage[key][item.name] !== undefined &&
				["weapon", "armor"].includes(key)
		);
		item.modification = itemFound ? item.modification + 1 : item.modification;

		const matchingItems = this.client.server.garage.items.filter(
			(element) =>
				element.id === item.name &&
				(element.modificationID === item.modification ||
					element.modificationID === undefined)
		);

		if (matchingItems.length === 0) {
			return false;
		}

		const itemData = matchingItems[0];
		const discount = Math.floor(itemData.discount?.percent || 0);
		const price = Math.floor(itemData.price * (1 - discount / 100));
		const total = price * item.quantity;

		if (total != item.value) {
			return false;
		}

		if (this.client.user.crystal < total) {
			return false;
		}

		this.client.user.crystal -= total;

		const { category } = itemData;
		const categoryGarage = (garage[category] = garage[category] || {});
		const itemGarage = (categoryGarage[item.name] =
			categoryGarage[item.name] || {});

		if (categoryGarage.equiped) {
			itemGarage.m = item.modification;
			categoryGarage.equiped = item.name;
		} else {
			itemGarage.count = (itemGarage.count || 0) + item.quantity;
		}

		if (!categoryGarage.equiped) {
			this.client.user.updateGarage();
		}

		return true;
	}
};
