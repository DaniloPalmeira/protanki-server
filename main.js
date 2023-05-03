const net = require("net");
const path = require("path");

const ProTankiClient = require("./classes/ProTankiClient");
const ProTankiServer = require("./classes/ProTankiServer");
const ProTankiGarageServer = require("./classes/server/ProTankiGarage");
const ProTankiLobbyServer = require("./classes/server/ProTankiLobby");
const ProTankiLobbyChatServer = require("./classes/server/ProTankiLobbyChat");

const logger = require("./helpers/logger");

const server = new ProTankiServer();
const lobbyChatServer = new ProTankiLobbyChatServer();
const lobbyServer = new ProTankiLobbyServer();
const garageServer = new ProTankiGarageServer();

const handleConnection = (socket) => {
	new ProTankiClient({
		socket,
		server,
		lobbyServer,
		lobbyChatServer,
		garageServer,
	});
};

process.on("uncaughtException", function (err) {
	logger.error(err.stack);
});

const __ports = [443];
for (const port of __ports) {
	let serverRun = net.createServer(handleConnection);
	serverRun.listen(port);
	logger.info(`Servidor iniciado na porta: ${port}`);
}

const ArmorToProperties = (transformedObject) => {
	const originalObject = {};

	for (const transformedProp of transformedObject) {
		const subprops = transformedProp.subproperties;

		if (subprops !== null) {
			const subpropNames = [];
			const subpropValues = [];

			// Separa os nomes e valores das subpropriedades
			for (const subprop of subprops) {
				subpropNames.push(subprop.property);
				subpropValues.push(subprop.value);
			}

			// Cria a propriedade principal com valor null e subpropriedades definidas
			originalObject[transformedProp.property] = {
				value: null,
				subproperties: subpropNames,
			};

			// Cria as subpropriedades como objetos separados
			for (let i = 0; i < subpropNames.length; i++) {
				const subpropName = subpropNames[i];
				const subpropValue = subpropValues[i];

				originalObject[subpropName] = {
					value: subpropValue,
					subproperties: null,
				};
			}
		} else {
			// Se não tiver subpropriedades, cria a propriedade como um objeto separado
			originalObject[transformedProp.property] = {
				value: transformedProp.value,
				subproperties: null,
			};
		}
	}

	return originalObject;
};

items = require("./helpers/garage/items.json");

const novaLista = items.map((obj) => {
	if ((obj.category == "armor") | (obj.category == "weapon")) {
		const { properts, object3ds, baseItemId, previewResourceId, ...resto } =
			obj;
		return resto;
	} else {
		return obj;
	}
});

console.log(JSON.stringify(novaLista));
