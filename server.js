const logger = require("./config/log");
const app = require("./config/express")();
const config = require("./config/config");

app.listen(config.express.port, config.express.ip, function(error) {
  if (error) {
    logger.error("Não foi possível iniciar a conexão", error);
    process.exit(10);
  }

  logger.info(`Servidor iniciado em ${config.express.ip}, ouvindo na porta ${config.express.port}`);
  logger.info(`App disponível em http://${config.express.ip}:${config.express.port}`);
})
.on('error', function(error) {
  logger.error("Erro inesperado : " + error);
});
