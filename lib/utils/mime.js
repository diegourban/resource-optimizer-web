const config = require("../../config/config");

exports.isValidMIMEType = function(mimeType) {
  return config.app.acceptedMIMEType.includes(mimeType);
}
