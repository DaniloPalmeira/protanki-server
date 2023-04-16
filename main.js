const net = require("net");

const ProTankiClient = require("./classes/ProTankiClient");
const ProTankiServer = require("./classes/ProTankiServer");
const ProTankiGarageServer = require("./classes/server/ProTankiGarage");
const ProTankiLobbyServer = require("./classes/server/ProTankiLobby");
const ProTankiLobbyChatServer = require("./classes/server/ProTankiLobbyChat");

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

const __ports = [1330];
for (const port of __ports) {
	let serverRun = net.createServer(handleConnection);
	serverRun.listen(port);
	console.log("Servidor iniciado na porta:", port);
}
