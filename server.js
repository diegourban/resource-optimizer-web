const app = require("./config/express")();
const config = require("./config/config");

// log
const bole = require("bole");

bole.output({level: "debug", stream: process.stdout})
const log = bole("server");

log.info("Servidor iniciando...");

app.listen(config.express.port, config.express.ip, function (error) {
  if (error) {
    log.error("Não foi possível iniciar a conexão", error);
    process.exit(10);
  }
  log.info("Servidor Express iniciado e ouvindo em http://" +
    config.express.ip + ":" + config.express.port)
})
.on('error', function(err){
    console.log('on error handler');
    console.log(err);
});
