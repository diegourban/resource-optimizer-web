// node
const os = require("os");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// externo
const formidable = require("formidable");
const fetch = require("node-fetch");
const archiver = require("archiver");

module.exports = function(app) {

  const uploadsDir = path.join(os.tmpdir(), "/uploads");

  if (!fs.existsSync(uploadsDir)) {
    console.log('Criando diretório de upload comum: ' + uploadsDir);
    fs.mkdirSync(uploadsDir);
  }

  app.post("/web/upload", function(req, res) {
    var form = new formidable.IncomingForm();

    // define que é possível fazer upload de múltiplos arquivos num único request
    form.multiples = true;

    // criando uma pasta com nome único
    const hash = generateHash();
    const currentUploadDir = path.join(uploadsDir, hash);
    fs.mkdirSync(currentUploadDir);

    const currentUploadInputDir = path.join(currentUploadDir, "input");
    fs.mkdirSync(currentUploadInputDir);

    const currentUploadOutputDir = path.join(currentUploadDir, "output");
    fs.mkdirSync(currentUploadOutputDir);

    var promises = [];

    form.on("file", function(field, file) {
      // para cada arquivo feito upload com sucesso,
      var extension = path.extname(file.name);
      var basename = path.basename(file.name, extension);
      var newPath = path.join(currentUploadInputDir, file.name);
      // renomeia para seu nome original,
      fs.renameSync(file.path, newPath);

      // prepara o strem de leitura do arquivo
      let readStream = fs.createReadStream(newPath);

      const requestInfo = {
        method: "POST",
        headers: {"Content-Type" : extensionToContentType(extension)},
        body: readStream
      }

      // envia para a API
      let fetchCall = fetch("http://localhost:3000/api/minify", requestInfo)
      .then(response => {
        const basename_min = basename + ".min" + extension;
        // escreve o retorno no destino .min
        var dest = fs.createWriteStream(path.join(currentUploadOutputDir, basename_min));
        response.body.pipe(dest);
      })
      .catch(error => {
        console.log(error);
      });
      promises.push(fetchCall);
    });

    form.on("error", function(err) {
      console.log("Ocorreu em erro: \n" + err);
    });

    form.on("end", function() {
      Promise.all(promises).then(function() {
        const zipFile = path.join(uploadsDir, hash, hash + ".zip");
        var output = fs.createWriteStream(zipFile);
        var archive = archiver('zip');

        output.on('close', function () {
          console.log(archive.pointer() + ' total de bytes');
          console.log('archiver foi finalizado e o arquivo de saída foi fechado.');
        });

        archive.on('error', function(err){
          throw err;
        });

        archive.pipe(output);

        archive.directory(currentUploadOutputDir, false);

        archive.finalize();
      }, function(err) {
        console.log(err);
      });

      var json = JSON.stringify({
        hash : hash
      });
      res.end(json);
    });

    form.parse(req);
  });

  app.get("/web/download/:hash", function(req, res) {
    const hash = req.params.hash;
    const zipFile = path.join(uploadsDir, hash, hash + ".zip");
    if(!fs.existsSync(zipFile)) {
      return res.status(404).send("Arquivo não encontrado");
    }

    res.sendFile(zipFile);
  });

  function generateHash() {
    const current_date = (new Date()).valueOf().toString();
    const random = Math.random().toString();
    return crypto.createHash('sha1').update(current_date + random).digest('hex');
  }

  function extensionToContentType(extension) {
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

}
