const { updateExperience, updateCrystal } = require("../helpers/db");
const { vectorPacket, createBonusPacket } = require("../protocol/package");
const ByteArray = require("./ByteArray");

const PRIVILEGE_LEVELS = {
	NONE: 0,
	LOW: 1,
	HIGH: 2,
};

module.exports = class {
	constructor(client) {
		this.client = client;

		this.commands = {
			help: {
				privilegeLevel: PRIVILEGE_LEVELS.NONE,
				minArgsCount: 0,
				execute: (command) => {
					Object.keys(this.commands).forEach((cmd) => {
						const minArgsCount = this.commands[cmd].minArgsCount;
						if (this.hasRequiredPrivilegeLevel(this.commands[cmd])) {
							const args = Array.from(
								{ length: minArgsCount },
								(_, i) => `arg${i + 1}`
							);
							this.replySystem(`/${cmd} ${args.join(" ")}`);
						}
					});
				},
			},
			e: {
				privilegeLevel: PRIVILEGE_LEVELS.LOW,
				minArgsCount: 1,
				execute: (command) => {
					eval(command.combinedArgs);
				},
			},
			take: {
				privilegeLevel: PRIVILEGE_LEVELS.NONE,
				minArgsCount: 0,
				execute: (command) => {
					if (this.client.user.battle) {
						this.client.user.battle.party.sendPacket(
							463494974,
							new ByteArray().writeUTF(this.client.user.username)
						);
					}
				},
			},
			gold: {
				privilegeLevel: PRIVILEGE_LEVELS.NONE,
				minArgsCount: 1,
				execute: (command) => {
					if (this.client.user.battle) {
						this.client.user.battle.party.sendPacket(
							-666893269,
							new ByteArray().writeUTF(command.combinedArgs).writeInt(490113)
						);
					}
				},
			},
			god: {
				privilegeLevel: PRIVILEGE_LEVELS.NONE,
				minArgsCount: 0,
				execute: (command) => {
					this.client.user.battle.healthPart = 1;
				},
			},
			reload: {
				privilegeLevel: PRIVILEGE_LEVELS.LOW,
				minArgsCount: 0,
				execute: (command) => {
					this.client.reloadClass();
				},
			},
			packet: {
				privilegeLevel: PRIVILEGE_LEVELS.LOW,
				minArgsCount: 1,
				execute: (command) => {
					this.client.sendPacket(command.args[0]);
				},
			},
			addcry: {
				privilegeLevel: PRIVILEGE_LEVELS.NONE,
				minArgsCount: 1,
				execute: (command) => {
					const { user } = this.client;
					user.crystal += Number(command.args[0]) || 0;
					if (user.crystal < 0) {
						user.crystal = 0;
					} else if (user.crystal > 99999999) {
						user.crystal = 99999999;
					}

					const crysPacket = new ByteArray();
					crysPacket.writeInt(user.crystal);
					this.sendPacket(-593513288, crysPacket);
					updateCrystal(user.crystal, user.uid);
				},
			},
			addrank: {
				privilegeLevel: PRIVILEGE_LEVELS.NONE,
				minArgsCount: 1,
				execute: (command) => {
					const { user } = this.client;
					const oldRank = user.rank;
					user.rank += Number(command.args[0]) || 0;
					if (user.rank < 1) {
						user.rank = 1;
					} else if (user.rank > 30) {
						user.rank = 30;
					}

					user.experience = user.getDataByRank(user.rank).currentRankScore + 1;

					user.updateProgress();
					const newRank = user.rank;

					if (oldRank !== newRank) {
						const rankLoopStart = oldRank;
						const rankLoopEnd = newRank;
						const loopDirection = oldRank < newRank ? 1 : -1;

						for (let i = rankLoopStart; i !== rankLoopEnd; i += loopDirection) {
							let ObjInfos = user.getDataByRank(i + loopDirection);
							let ObjInfosOld = user.getDataByRank(i);
							const userDataInfos = new ByteArray();
							userDataInfos.writeInt(i + loopDirection);
							userDataInfos.writeInt(
								i + loopDirection != newRank
									? ObjInfos.nextRankScore - 1
									: user.experience
							);
							userDataInfos.writeInt(ObjInfos.currentRankScore);
							userDataInfos.writeInt(ObjInfos.nextRankScore);
							userDataInfos.writeInt(ObjInfos.bonusCrystals);

							if (i < i + loopDirection) {
								user.crystal += ObjInfos.bonusCrystals;
							} else {
								user.crystal -= ObjInfosOld.bonusCrystals;
							}
							if (user.crystal < 0) {
								user.crystal = 0;
							}
							this.sendPacket(1989173907, userDataInfos);
						}

						const crysPacket = new ByteArray();
						crysPacket.writeInt(user.crystal);
						this.sendPacket(-593513288, crysPacket);
						updateCrystal(user.crystal, user.uid);
					}

					const scorePacket = new ByteArray();
					scorePacket.writeInt(user.experience);
					this.sendPacket(2116086491, scorePacket);
					updateExperience(user.experience, user.uid);
				},
			},
			addscore: {
				privilegeLevel: PRIVILEGE_LEVELS.NONE,
				minArgsCount: 1,
				execute: (command) => {
					const { user } = this.client;
					const oldRank = user.rank;
					user.experience += Number(command.args[0]) || 0;
					if (user.experience < 0) {
						user.experience = 0;
					} else if (user.experience > 99999999) {
						user.experience = 99999999;
					}
					user.updateProgress();
					const newRank = user.rank;

					if (oldRank !== newRank) {
						const rankLoopStart = oldRank;
						const rankLoopEnd = newRank;
						const loopDirection = oldRank < newRank ? 1 : -1;

						for (let i = rankLoopStart; i !== rankLoopEnd; i += loopDirection) {
							let ObjInfos = user.getDataByRank(i + loopDirection);
							let ObjInfosOld = user.getDataByRank(i);
							const userDataInfos = new ByteArray();
							userDataInfos.writeInt(i + loopDirection);
							userDataInfos.writeInt(
								i + loopDirection != newRank
									? ObjInfos.nextRankScore - 1
									: user.experience
							);
							userDataInfos.writeInt(ObjInfos.currentRankScore);
							userDataInfos.writeInt(ObjInfos.nextRankScore);
							userDataInfos.writeInt(ObjInfos.bonusCrystals);

							if (i < i + loopDirection) {
								user.crystal += ObjInfos.bonusCrystals;
							} else {
								user.crystal -= ObjInfosOld.bonusCrystals;
							}
							if (user.crystal < 0) {
								user.crystal = 0;
							}
							this.sendPacket(1989173907, userDataInfos);
						}

						const crysPacket = new ByteArray();
						crysPacket.writeInt(user.crystal);
						this.sendPacket(-593513288, crysPacket);
						updateCrystal(user.crystal, user.uid);
					}

					const scorePacket = new ByteArray();
					scorePacket.writeInt(user.experience);
					this.sendPacket(2116086491, scorePacket);
					updateExperience(user.experience, user.uid);
				},
			},
			drop: {
				privilegeLevel: PRIVILEGE_LEVELS.NONE,
				minArgsCount: 1,
				execute: (command) => {
					const { battle } = this.client.user;
					const { party, position } = battle;
					const { args, argCount } = command;

					const bonusType = args[0];
					const bonusId = ++party.bonusId;
					const bonusName = `${bonusType}_${bonusId}`;
					party.bonusList.push(bonusName);

					let timeMS = 30000;
					if (argCount == 2) {
						timeMS = parseInt(args[1]);
					}

					const bonusPosition = JSON.parse(JSON.stringify(position));
					bonusPosition.z += 1000;
					const bonusPacket = new ByteArray(
						createBonusPacket(bonusName, bonusPosition, timeMS)
					);
					party.sendPacket(1831462385, bonusPacket);
				},
			},
		};
	}

	sendPacket(packetID, packet = new ByteArray()) {
		this.client.sendPacket(packetID, packet);
	}

	hasRequiredPrivilegeLevel(commandFunction) {
		const requiredPrivilegeLevel =
			commandFunction.privilegeLevel ?? PRIVILEGE_LEVELS.NONE;
		const userPrivilegeLevel =
			this.client.user.privLevel ?? PRIVILEGE_LEVELS.NONE;
		return userPrivilegeLevel >= requiredPrivilegeLevel;
	}

	hasRequiredArgCount(commandFunction, argCount) {
		const requiredArgCount = commandFunction.minArgsCount ?? 0;
		return argCount >= requiredArgCount;
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
			if (
				this.hasRequiredPrivilegeLevel(commandHandler) &&
				this.hasRequiredArgCount(commandHandler, command.argCount)
			) {
				try {
					const boundHandler = commandHandler.execute.bind(this);
					boundHandler(command);
					this.replySystem("Comando executado sem ocorrências de erros!");
				} catch (e) {
					this.replySystem(e.stack);
				}
			} else {
				this.replySystem(
					this.hasRequiredPrivilegeLevel(commandHandler)
						? "O comando não está completo"
						: "Te falta permissões"
				);
			}
		} else {
			this.replySystem("Falha no comando de bate-papo");
		}
	}

	parseCommand(commandString) {
		const [cmd, ...args] = commandString.split(" ");
		const combinedArgs = args.join(" ");
		const argCount = args.length;

		return {
			cmd: cmd.slice(1).toLowerCase(),
			args,
			combinedArgs,
			argCount,
		};
	}
};
