const bytearray = require("./modules/bytearray");

// console.log(parseInt(325, 10));

var msg = new bytearray();

// console.log(msg.readInt());
// console.log(msg.readInt());
// console.log(msg.readInt());
// console.log();

msg.writeInt(0).writeInt(336728);

console.log(
	msg.readUInt().toString(8) +
		"/" +
		msg.readUShort().toString(8) +
		"/" +
		msg.readUByte().toString(8) +
		"/" +
		msg.readUByte().toString(8)
);

// // "/readUnsignedInt().toString(8)/readUnsignedShort().toString(8)/readUnsignedByte().toString(8)/readUnsignedByte().toString(8)/_loc5/"

// console.log(msg);

// _data = 325;
// console.log(parseInt(_data, 8));
