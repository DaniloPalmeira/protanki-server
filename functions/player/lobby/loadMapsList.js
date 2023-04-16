const ByteArray = require("../../../classes/ByteArray");

loadMapsList = function () {
	var packet = new ByteArray();

	var json = {
		maxRangeLength: this.privLevel == 0 ? 10 : 30,
		battleCreationDisabled: this.user.rank == 1 && this.privLevel == 0,
		battleLimits: [
			{ battleMode: "DM", scoreLimit: 999, timeLimitInSec: 59940 },
			{ battleMode: "TDM", scoreLimit: 999, timeLimitInSec: 59940 },
			{ battleMode: "CTF", scoreLimit: 999, timeLimitInSec: 59940 },
			{ battleMode: "CP", scoreLimit: 999, timeLimitInSec: 59940 },
			{ battleMode: "AS", scoreLimit: 999, timeLimitInSec: 59940 },
		],
		maps: this.server.maps.map((item) => {
			if (this.user.privLevel != 0) {
				// if (item.enabled == false) {
				// 	item.mapName = item.mapName;
				// }
				item.minRank = 1; // habilita todos rank em todos mapas para os priv diferente de 0
				item.enabled = true; // habilita todos para os priv diferente de 0
			} else if (this.user.rank == 1) {
				item.enabled = false; // desabilita todos pra buteco
			}
			return item;
		}),
	};

	packet.writeUTF(JSON.stringify(json));

	this.sendPacket(-838186985, packet);
};

module.exports = loadMapsList;
