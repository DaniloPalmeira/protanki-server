const { createLogger, transports, format } = require("winston");

// Obtendo o nível de log do argumento da linha de comando, se disponível.
// Caso contrário, use 'info' como padrão.
const logLevel = process.argv[2] || "warn";
console.log(logLevel);

const logger = createLogger({
  transports: [
    new transports.Console({
      level: logLevel, // Usando o nível de log dinâmico aqui
      format: format.combine(format.colorize(), format.simple()),
    }),
    new transports.File({
      filename: "logs/error.log",
      level: "error",
      format: format.combine(format.timestamp(), format.json()),
    }),
  ],
});

module.exports = logger;
