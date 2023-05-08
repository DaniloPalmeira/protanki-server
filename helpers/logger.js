const { createLogger, transports, format } = require("winston");

const logger = createLogger({
	transports: [
		new transports.Console({
			level: "debug",
			format: format.combine(format.colorize(), format.simple()),
		}),
		new transports.File({
			filename: "logs/error.log",
			level: "error",
			format: format.combine(format.timestamp(), format.json()),
		}),
		new transports.File({
			filename: "logs/info.log",
			level: "info",
			format: format.combine(format.timestamp(), format.json()),
		}),
		new transports.File({
			filename: "logs/combined.log",
			format: format.combine(format.timestamp(), format.json()),
		}),
	],
});

module.exports = logger;
