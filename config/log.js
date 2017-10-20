const winston = require("winston");

winston.add(winston.transports.File, { filename: "web.log" });

if (process.env.NODE_ENV === "production") {
  winston.remove(winston.transports.Console);
}

module.exports = winston;
