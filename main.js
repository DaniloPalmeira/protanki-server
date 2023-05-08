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

// process.on("uncaughtException", function (err) {
// 	logger.error(err.stack);
// });

const __ports = [1337];
for (const port of __ports) {
	let serverRun = net.createServer(handleConnection);
	serverRun.listen(port);
	logger.info(`Servidor iniciado na porta: ${port}`);
}
