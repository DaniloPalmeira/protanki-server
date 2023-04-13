module.exports = function async(item) {
	for (const key in this.user.garage) {
		if (item.name in this.user.garage[key]) {
			if (
				this.user.garage[key][item.name].m == item.modification ||
				this.user.garage[key][item.name].m == undefined
			) {
				this.user.garage[key].equiped = item.name;
				this.user.updateGarage();
				return true;
			}
		}
	}
	return false;
};
