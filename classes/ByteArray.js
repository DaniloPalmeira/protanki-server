class ByteArray {
	constructor(buffer) {
		this.buffer = buffer ? Buffer.from(buffer) : Buffer.alloc(0);
	}

	writeByte(value) {
		let buffer = new Buffer.alloc(1);
		buffer.writeInt8(value);
		this.buffer = Buffer.concat([this.buffer, buffer]);
		return this;
	}

	writeUByte(value) {
		let buffer = new Buffer.alloc(1);
		buffer.writeUInt8(value);
		this.buffer = Buffer.concat([this.buffer, buffer]);
		return this;
	}

	writeShort(value) {
		let buffer = new Buffer.alloc(2);
		buffer.writeInt16BE(value);
		this.buffer = Buffer.concat([this.buffer, buffer]);
		return this;
	}

	writeUShort(value) {
		let buffer = new Buffer.alloc(2);
		buffer.writeUInt16BE(value);
		this.buffer = Buffer.concat([this.buffer, buffer]);
		return this;
	}

	writeInt(value) {
		let buffer = new Buffer.alloc(4);
		buffer.writeInt32BE(value);
		this.buffer = Buffer.concat([this.buffer, buffer]);
		return this;
	}

	writeIntStart(value) {
		let buffer = new Buffer.alloc(4);
		buffer.writeInt32BE(value);
		this.buffer = Buffer.concat([buffer, this.buffer]);
		return this;
	}

	writeUInt(value) {
		let buffer = new Buffer.alloc(4);
		buffer.writeUInt32BE(value);
		this.buffer = Buffer.concat([this.buffer, buffer]);
		return this;
	}

	writeFloat(value) {
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

	writeObject(obj) {
		value = JSON.stringify(obj);
		return this.writeUTF(value);
	}

	writeBoolean(value) {
		return this.writeByte(value ? 1 : 0);
	}

	write(value) {
		this.buffer = Buffer.concat([this.buffer, new Buffer.from(value)]);
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

	bytesAvailable() {
		return this.buffer.length;
	}
}

module.exports = ByteArray;
