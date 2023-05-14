const fs = require("fs");
const path = require("path");

const fileNames = fs.readdirSync(__dirname);

const isBase64 = (str) => {
	return /^[A-Za-z0-9+/]+={0,2}$/.test(str);
};

fileNames.forEach((fileName) => {
	const filePath = path.join(__dirname, fileName);

	// Verifica se o item é um arquivo (ignora pastas)
	if (fs.statSync(filePath).isFile() && isBase64(fileName)) {
		const encodedFileName = fileName;
		const decodedFileName = Buffer.from(encodedFileName, "base64")
			.toString("utf-8")
			.replace("http://146.59.110.103/", "");

		if (decodedFileName !== "") {
			const filePath = path.join(__dirname, decodedFileName);

			// Obtém a pasta que contém o arquivo (que inclui o nome do arquivo)
			const fileFolder = path.dirname(filePath);

			// Cria a pasta se ela ainda não existir
			fs.mkdirSync(fileFolder, { recursive: true });

			// Lê o conteúdo do arquivo
			const fileContent = fs.readFileSync(path.join(__dirname, fileName), {
				encoding: null,
			});

			// Escreve o conteúdo do arquivo
			fs.writeFileSync(filePath, fileContent, { flag: "w" });

			console.log(`Arquivo ${filePath} criado com sucesso!`);
		}
	}
});
