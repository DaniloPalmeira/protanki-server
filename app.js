const net = require("net");
const path = require("path");

const ProTankiClient = require("./src/classes/ProTankiClient");
const ProTankiServer = require("./src/classes/ProTankiServer");
const ProTankiGarageServer = require("./src/classes/server/ProTankiGarage");
const ProTankiLobbyServer = require("./src/classes/server/ProTankiLobby");
const ProTankiLobbyChatServer = require("./src/classes/server/ProTankiLobbyChat");

const logger = require("./src/helpers/logger");

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

const __ports = [1337];
for (const port of __ports) {
	let serverRun = net.createServer(handleConnection);
	serverRun.listen(port);
	logger.info(`Servidor iniciado na porta: ${port}`);
}
