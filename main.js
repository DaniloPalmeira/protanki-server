const net = require("net");

const ProTankiClient = require("./modules/ProTankiClient");
const ProTankiServer = require("./modules/ProTankiServer");
const ProTankiGarage = require("./modules/Interface/ProTankiGarage");
const ProTankiLobby = require("./modules/Interface/ProTankiLobby");
const ProTankiLobbyChat = require("./modules/Interface/ProTankiLobbyChat");
// const ByteArray = require("./modules/bytearray");

// const Onw = new ByteArray("\x0c");
// console.log(Onw.readByte());

const server = new ProTankiServer();
const lobbyChat = new ProTankiLobbyChat();
const lobby = new ProTankiLobby();
const garage = new ProTankiGarage();

var __ports = [1330];
for (var i in __ports) {
	var serverRun = net.createServer((socket) => {
		new ProTankiClient({ socket, server, lobby, lobbyChat, garage });
	});
	serverRun.listen(__ports[i]);
	console.log("Servidor iniciado na porta:", __ports[i]);
}
