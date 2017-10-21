const fs = require("fs");
const fetch = require("node-fetch");
const logger = require("winston");
const config = require("../../config/config");

exports.fetchAPI = function(requestInfo, dest) {
  let apiUrl = `http://${config.api.ip}:${config.api.port}${config.api.url}`;
  
  return fetch(apiUrl, requestInfo)
  .then(response => {
    response.body.pipe(fs.createWriteStream(dest));
  })
  .catch(error => {
    logger.error("Erro inesperado" + error);
  });
}
