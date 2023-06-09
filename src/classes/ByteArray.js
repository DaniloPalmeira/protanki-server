const { Vector3 } = require("three");
const logger = require("../helpers/logger");

class ByteArray {
	constructor(buffer) {
		if (buffer instanceof ByteArray) {
			this.buffer = buffer.buffer;
		} else {
			this.buffer = buffer ? Buffer.from(buffer) : Buffer.alloc(0);
		}
	}

	writeByte(value = null) {
		if (value == null) {
			logger.warn("writeByte não pode escrever um valor nulo");
			return this;
		}
		let buffer = new Buffer.alloc(1);
		buffer.writeInt8(value);
		this.buffer = Buffer.concat([this.buffer, buffer]);
		return this;
	}

	writeUByte(value = null) {
		if (value == null) {
			logger.warn("writeUByte não pode escrever um valor nulo");
			return this;
		}
		let buffer = new Buffer.alloc(1);
		buffer.writeUInt8(value);
		this.buffer = Buffer.concat([this.buffer, buffer]);
		return this;
	}

	writeShort(value = null) {
		if (value == null) {
			logger.warn("writeShort não pode escrever um valor nulo");
			return this;
		}
		let buffer = new Buffer.alloc(2);
		buffer.writeInt16BE(value);
		this.buffer = Buffer.concat([this.buffer, buffer]);
		return this;
	}

	writeUShort(value = null) {
		if (value == null) {
			logger.warn("writeUShort não pode escrever um valor nulo");
			return this;
		}
		let buffer = new Buffer.alloc(2);
		buffer.writeUInt16BE(value);
		this.buffer = Buffer.concat([this.buffer, buffer]);
		return this;
	}

	writeInt(value = null) {
		if (value == null) {
			logger.warn("writeInt não pode escrever um valor nulo");
			return this;
		}
		let buffer = new Buffer.alloc(4);
		buffer.writeInt32BE(value);
		this.buffer = Buffer.concat([this.buffer, buffer]);
		return this;
	}

	writeUInt(value = null) {
		if (value == null) {
			logger.warn("writeUInt não pode escrever um valor nulo");
			return this;
		}
		let buffer = new Buffer.alloc(4);
		buffer.writeUInt32BE(value);
		this.buffer = Buffer.concat([this.buffer, buffer]);
		return this;
	}

	writeFloat(value = null) {
		if (value == null) {
			logger.warn("writeFloat não pode escrever um valor nulo");
			return this;
		}
		let buffer = new Buffer.alloc(4);
		buffer.writeFloatBE(value);
		this.buffer = Buffer.concat([this.buffer, buffer]);
		return this;
	}

	writeUTF(value = null) {
		if (value == null) {
			this.writeBoolean(true);
			return this;
		} else {
			this.writeBoolean(false);
			var buff = new Buffer.from(value);
			return this.writeInt(buff.length).write(buff);
		}
	}

	writeObject(obj = null) {
		if (obj == null) {
			logger.warn("writeObject não pode escrever um valor nulo");
			return this;
		}
		const value = JSON.stringify(obj);
		return this.writeUTF(value);
	}

	writeBoolean(value = null) {
		if (value == null) {
			logger.warn("writeBoolean não pode escrever um valor nulo");
			return this;
		}
		return this.writeByte(value ? 1 : 0);
	}

	write(value = null) {
		if (value == null) {
			logger.warn("write não pode escrever um valor nulo");
			return this;
		}
		this.buffer = Buffer.concat([this.buffer, new Buffer.from(value)]);
		return this;
	}

	writePacket(value = null) {
		this.write(value.buffer ?? "");
		return this;
	}

	readByte() {
		let value = this.buffer.slice(0, 1).readInt8();
		this.buffer = this.buffer.slice(1);

		return parseInt(value);
	}

	readUByte() {
		let value = this.buffer.slice(0, 1).readUInt8();
		this.buffer = this.buffer.slice(1);

		return parseInt(value);
	}

	readShort() {
		let value = this.buffer.slice(0, 2).readInt16BE();
		this.buffer = this.buffer.slice(2);

		return parseInt(value);
	}

	readUShort() {
		let value = this.buffer.slice(0, 2).readUInt16BE();
		this.buffer = this.buffer.slice(2);

		return parseInt(value);
	}

	readInt() {
		let value = this.buffer.slice(0, 4).readInt32BE();
		this.buffer = this.buffer.slice(4);

		return parseInt(value);
	}

	readFloat() {
		let value = this.buffer.slice(0, 4).readFloatBE();
		this.buffer = this.buffer.slice(4);

		return value;
	}

	readUInt() {
		let value = this.buffer.slice(0, 4).readUInt32BE();
		this.buffer = this.buffer.slice(4);

		return parseInt(value);
	}

	readUTF() {
		var empty = this.readBoolean();
		if (!empty) {
			let len = this.readInt();
			let str = this.buffer.slice(0, len);
			this.buffer = this.buffer.slice(len);

			return str.toString();
		} else {
			return null;
		}
	}

	readObject() {
		const value = this.readUTF();
		return JSON.parse(value);
	}

	readBytes(size) {
		let buff = this.buffer.slice(0, size);
		this.buffer = this.buffer.slice(size);

		return buff;
	}

	readBoolean() {
		return this.readByte() !== 0;
	}

	readVector() {
		const vector = new Vector3();
		if (!this.readBoolean()) {
			vector.set(this.readFloat(), this.readFloat(), this.readFloat());
		}
		return vector;
	}

	writeVector(vector) {
		return this.writeBoolean(false)
			.writeFloat(vector.x)
			.writeFloat(vector.y)
			.writeFloat(vector.z);
	}

	get bytesAvailable() {
		return this.buffer.length;
	}

	clone() {
		return new ByteArray(this.buffer);
	}

	packetLength() {
		let value = this.buffer.slice(0, 4).readInt32BE();
		return value;
	}
}

module.exports = ByteArray;
