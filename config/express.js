const express = require("express");
const load = require("express-load");

module.exports = function() {
  var app = express();

  app.use(express.static('./public'));

  load("routes", {cwd : "lib"}).into(app);

  return app;
}
