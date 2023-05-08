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

module.exports = { encryptPacket, decryptPacket };
