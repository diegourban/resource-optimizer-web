var app = require("./app/index")();
var config = require("./app/config");

// log
var bole = require("bole");

bole.output({level: "debug", stream: process.stdout})
var log = bole("server");

log.info("Servidor iniciando...");

app.listen(config.express.port, config.express.ip, function (error) {
  if (error) {
    log.error("Não foi possível iniciar a conexão", error);
    process.exit(10);
  }
  log.info("Servidor Express iniciado e ouvindo em http://" +
    config.express.ip + ":" + config.express.port)
})
