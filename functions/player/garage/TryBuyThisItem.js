const getItemByIdAndModification = require("./getItemByIdAndModification");

module.exports = async function (item) {
	item.modification = await getItemByIdAndModification.call(
		this,
		item.name,
		item.modification
	);
	for (let index = 0; index < this.server.garage.items.length; index++) {
		const element = this.server.garage.items[index];
		if (element.id == item.name) {
			if (
				element.modificationID == item.modification ||
				element.modificationID == undefined
			) {
				this.user.crystal -= element.price * item.quantity;
				if (this.user.garage[element.category]) {
					if (!this.user.garage[element.category][item.name]) {
						this.user.garage[element.category][item.name] = {};
					}
					if (this.user.garage[element.category].equiped) {
						if (element.modificationID != undefined) {
							this.user.garage[element.category][item.name].m =
								item.modification;
						}
						this.user.garage[element.category].equiped = item.name;
					} else {
						if (this.user.garage[element.category][item.name].count) {
							this.user.garage[element.category][item.name].count +=
								item.quantity;
						} else {
							this.user.garage[element.category][item.name].count =
								item.quantity;
						}
					}
				} else {
					this.user.garage[element.category] = {};
					this.user.garage[element.category][item.name] = {
						m: item.modification,
						count: item.quantity,
					};
				}
				if (!this.user.garage[element.category].equiped) {
					this.user.updateGarage();
				}
				return true;
			}
		}
	}
	return false;
};
