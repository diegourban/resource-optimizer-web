const express = require("express");
const load = require("express-load");

module.exports = function() {
  var app = express();

  app.use(express.static('./app/public'));

  load("routes", {cwd : "app"}).into(app);

  return app;
}
