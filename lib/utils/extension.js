exports.extensionToContentType = function(extension) {
  if(extension === ".css") {
    return "text/css";
  }
  if(extension === ".html") {
    return "text/html";
  }

  if(extension === ".js") {
    return "text/javascript";
  }

  if(extension === ".jpg") {
    return "image/jpeg";
  }

  if(extension === ".png") {
    return "image/png";
  }

  return "invalid";
}
