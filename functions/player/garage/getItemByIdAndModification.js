module.exports = async function (itemName, modification) {
	for (const key in this.user.garage) {
		if (this.user.garage[key][itemName] != undefined) {
			if (key == "weapon" || key == "armor") {
				return modification + 1;
			}
			break;
		}
	}
	return modification;
};
