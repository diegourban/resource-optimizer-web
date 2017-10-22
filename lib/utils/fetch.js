const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const logger = require("winston");

const config = require("../../config/config");
const extensionutils = require("./extension");

exports.fetchAPI = function(src, dest) {

  let apiUrl = `http://${config.api.ip}:${config.api.port}${config.api.url}`;

  let extension = extensionutils.extensionToContentType(path.extname(src));
  let requestInfo = {
    method: "POST",
    headers: {"Content-Type" : extension},
    body: fs.createReadStream(src)
  }

  return fetch(apiUrl, requestInfo)
  .then(response => {
    response.body.pipe(fs.createWriteStream(dest));
  })
  .catch(error => {
    logger.error("Erro inesperado" + error);
  });
}
