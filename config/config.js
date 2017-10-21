var config = module.exports

config.express = {
  port: process.env.EXPRESS_PORT || 3001,
  ip: "localhost"
}

config.app = {
  uploadName: "projectFile",
  acceptedMIMEType: ["application/zip", "application/x-zip-compressed"],
  uploadsFolder: "/uploads",
  extractedFolder: "__extracted",
  optimizedFolder: "__optimized"
}

config.api = {
  ip: "localhost",
  port: "3000",
  url: "/api/minify"
}
