const http = require("http");
const xmlJs = require("xml-js");
const ByteArray = require("../classes/ByteArray");

const urlBase = "http://146.59.110.103";

function idToPath(id, version) {
	const packet = new ByteArray();
	packet.writeInt(0);
	packet.writeInt(id);

	return (
		"/" +
		packet.readUInt().toString(8) +
		"/" +
		packet.readUShort().toString(8) +
		"/" +
		packet.readUByte().toString(8) +
		"/" +
		packet.readUByte().toString(8) +
		"/" +
		version.toString(8) +
		"/"
	);
}

function xmlToJson(xmlString) {
	const options = {
		compact: true,
		ignoreComment: true,
		ignoreDeclaration: true,
		ignoreAttributes: false,
		attributeNamePrefix: "@",
	};

	const result = xmlJs.xml2js(xmlString, options);
	const proplibs = result.proplibs.library;

	const proplibsJson = proplibs.map((library) => {
		return parseInt("0x" + library._attributes["resource-id"], 16);
	});

	return proplibsJson;
}

async function getXml(id, version) {
	const midPath = idToPath(id, version);

	return new Promise((resolve) => {
		console.log("Obtendo", urlBase + midPath + "proplibs.xml");
		http
			.get(urlBase + midPath + "proplibs.xml", (res) => {
				let data = "";

				res.on("data", (chunk) => {
					data += chunk;
				});

				res.on("end", () => {
					const xml = xmlToJson(data);
					resolve(xml);
				});
			})
			.on("error", (err) => {
				console.error(err);
				resolve({});
			});
	});
}

module.exports = getXml;
