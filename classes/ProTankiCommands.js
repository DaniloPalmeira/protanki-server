const ByteArray = require("./ByteArray");

module.exports = class {
	constructor(client) {
		this.client = client;
	}

	commands = {
		e: function (command) {
			if (this.requiredPrivLevel(1)) {
				try {
					eval(command.combinedArgs);
					this.replySystem("Tarefa concluída sem ocorrências de erros!");
				} catch (e) {
					this.replySystem(e.stack);
				}
			}
		},
		p: function (command) {
			if (this.requiredPrivLevel(1)) {
				try {
					this.client.sendPacket(command.args[0]);
					this.replySystem("Pacote enviado sem ocorrências de erros!");
				} catch (e) {
					this.replySystem(e.stack);
				}
			}
		},
	};

	// FUNÇÕES SINCRONAS
	sendPacket(packetID, packet = new ByteArray()) {
		this.client.sendPacket(packetID, packet);
	}

	reply(msgObject) {
		if (!this.client.battle) {
			this.client.lobbyChat.sendMessageList([msgObject], true);
		}
	}

	replySystem(text) {
		if (!this.client.user.battle) {
			this.client.lobbyChat.sendMessageList(
				[
					{
						system: true,
						text,
					},
				],
				true
			);
		} else {
			const packet = new ByteArray();
			packet.writeUTF(text);
			this.client.sendPacket(606668848, packet);
		}
	}

	parse(message) {
		const command = this.parseCommand(message);

		const commandHandler = this.commands[command.cmd];

		if (commandHandler) {
			const boundHandler = commandHandler.bind(this);
			boundHandler(command, this.client.user);
		} else {
			this.replySystem("Falha no comando de bate-papo");
		}
	}

	parseCommand(commandString) {
		// Separando o comando dos argumentos
		const parts = commandString.split(" ");
		const cmd = parts[0].toLowerCase().slice(1);
		const args = parts.slice(1);

		// Combinando os argumentos em uma única string
		const combinedArgs = args.join(" ");

		// Adicionando a contagem de argumentos ao retorno
		const argCount = args.length;

		return {
			cmd,
			args,
			combinedArgs,
			argCount,
		};
	}

	requiredPrivLevel(privLevelRequired) {
		if (this.client.user.privLevel >= privLevelRequired) {
			return true;
		} else {
			this.replySystem("Falha no comando de bate-papo");
			return false;
		}
	}
};
