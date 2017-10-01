const express = require("express");
const load = require("express-load");

module.exports = function() {
  var app = express();

  load("routes", {cwd : "app"}).into(app);

  return app;
}
