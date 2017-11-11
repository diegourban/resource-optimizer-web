const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const logger = require("winston");

const config = require("../../config/config");
const extensionutils = require("./extension");

exports.fetchAPI = function(src, dest, options) {
  var queryParams = jsonToQueryString(options);

  let apiUrl = `http://${config.api.ip}:${config.api.port}${config.api.url}${queryParams}`;

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
    logger.error("Erro inesperado ao se conectar com a API.\n" + error);
    return error;
  });
}

function jsonToQueryString(json) {
    return '?' + Object.keys(json).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(json[key]);
    }).join('&');
}
