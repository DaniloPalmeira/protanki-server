const ByteArray = require("../classes/ByteArray");

function generateKeys() {
	var keys = [];
	for (var i = 0; i < 4; i++) {
		var key = Math.floor(Math.random() * -120) - 1; // gera um número aleatório entre -1 e -120
		keys.push(key);
	}
	return keys;
}

function encryptionPacket(encryptionKeys) {
	const keys = generateKeys();

	const packet = new ByteArray();
	packet.writeInt(keys.length);

	keys.forEach((val) => {
		packet.writeByte(val);
	});

	setCrypsKeys(keys, encryptionKeys);

	return packet;
}

function setCrypsKeys(keys, encryptionKeys) {
	let base = 0;
	for (let i = 0; i < keys.length; i++) {
		base ^= keys[i];
	}
	for (let i = 0; i < encryptionKeys.encryptionLenght; i++) {
		const encryptionKey = base ^ (i << 3);
		const decryptionKey = encryptionKey ^ 87;

		encryptionKeys.encrypt_keys[i] = encryptionKey;
		encryptionKeys.decrypt_keys[i] = decryptionKey;
	}
}

function decryptPacket(packet, keys) {
	// Cria uma cópia do pacote original
	const decryptedPacket = packet.clone();

	// Itera sobre os bytes do pacote
	for (let i = 0; i < decryptedPacket.buffer.length; i++) {
		// Lê o byte atual para descriptografar
		const byteToDecrypt = decryptedPacket.buffer[i];

		// Descriptografa o byte atual usando a chave de descriptografia atual
		keys.decrypt_keys[keys.decrypt_position] ^= byteToDecrypt;

		// Escreve o byte descriptografado no lugar do byte original no pacote
		decryptedPacket.buffer[i] = keys.decrypt_keys[keys.decrypt_position];

		// Altera a posição da chave de descriptografia de acordo com o byte descriptografado
		keys.decrypt_position ^= keys.decrypt_keys[keys.decrypt_position] & 7;
	}

	// Retorna o pacote descriptografado
	return decryptedPacket;
}

function encryptPacket(packet, keys) {
	// Cria uma cópia do pacote original
	const encryptedPacket = packet.clone();

	// Itera sobre os bytes do pacote
	for (let i = 0; i < encryptedPacket.buffer.length; i++) {
		// Lê o byte atual para criptografar
		const byteToEncrypt = encryptedPacket.buffer[i];

		// Criptografa o byte atual usando a chave de criptografia atual
		encryptedPacket.buffer[i] =
			byteToEncrypt ^ keys.encrypt_keys[keys.encrypt_position];

		// Armazena o byte criptografado como a nova chave de criptografia
		keys.encrypt_keys[keys.encrypt_position] = byteToEncrypt;

		// Altera a posição da chave de criptografia de acordo com o byte criptografado
		keys.encrypt_position ^= byteToEncrypt & 7;
	}

	// Retorna o pacote criptografado
	return encryptedPacket;
}

module.exports = {
	encryptPacket,
	decryptPacket,
	setCrypsKeys,
	generateKeys,
	encryptionPacket,
};
