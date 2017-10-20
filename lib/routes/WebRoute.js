// node
const os = require("os");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// externo
const unzip = require("unzip");
const multer = require("multer");
const fetch = require("node-fetch");
const archiver = require("archiver");
const size = require("get-folder-size");

module.exports = function(app) {

  const UPLOADS_DIR = path.join(os.tmpdir(), "/uploads");
  const EXTRACTED_DIR = "__extracted";
  const OPTIMIZED_DIR = "__optimized";

  var upload = multer({ dest: os.tmpdir() });

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('Criando diretório de upload comum: ' + UPLOADS_DIR);
    fs.mkdirSync(UPLOADS_DIR);
  }

  app.post("/web/upload", upload.single("projectFile"), function(req, res) {
    if(req.file.mimetype !== "application/zip") {
      return res.status(415).send("O arquivo selecionado não é suportado");
    }

    // criando uma pasta com nome único para esse upload
    const hash = generateHash();
    console.log(hash);

    const currentUploadDir = path.join(UPLOADS_DIR, hash);
    fs.mkdirSync(currentUploadDir);

    const currentExtractedDir = path.join(currentUploadDir, EXTRACTED_DIR);
    fs.mkdirSync(currentExtractedDir);

    fs.createReadStream(req.file.path).pipe(unzip.Extract({path: currentExtractedDir}))
    .on("close", function() {
      console.log("Todos os dados foram extraídos");
      processDirectory(hash, currentUploadDir, currentExtractedDir)
      .then(function(stats) {
        console.log(stats);
        var json = JSON.stringify({
          stats : JSON.parse(stats),
          hash: hash,
          url: "/web/download/" + hash
        });
        res.end(json);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send({ error: 'Something failed!' });
      })
    });
  });

  app.get("/web/download/:hash", function(req, res) {
    const hash = req.params.hash;
    const zipFile = path.join(UPLOADS_DIR, hash, hash + ".zip");
    if(!fs.existsSync(zipFile)) {
      return res.status(404).send("Arquivo não encontrado");
    }

    res.sendFile(zipFile);
  });

  function processDirectory(hash, currentUploadDir, startingDirectory) {
    return new Promise(function(resolve, reject) {
      var stack = [startingDirectory];

      var promises = [];

      while (stack.length) {
        var currentPath = stack.pop();
        var currentFile = fs.statSync(currentPath);

        // dirtórios são adicionados na pilha
        if (currentFile.isDirectory()) {
          fs.mkdirSync(currentPath.replace(EXTRACTED_DIR, OPTIMIZED_DIR));
          fs.readdirSync(currentPath).forEach(function(p) {
              stack.push(currentPath + path.sep + p);
          });
        // arquivos são copiados ou otimizados
        } else {
          let extension = extensionToContentType(path.extname(currentPath));

          if(extension === "invalid") {
            fs.createReadStream(currentPath).pipe(fs.createWriteStream(currentPath.replace(EXTRACTED_DIR, OPTIMIZED_DIR)));
          } else {
            const requestInfo = {
              method: "POST",
              headers: {"Content-Type" : extension},
              body: fs.createReadStream(currentPath)
            }

            // envia para a API otimizar
            let fetchCall = fetchAPI(requestInfo, currentPath);
            promises.push(fetchCall);
          }
        }
      }

      Promise.all(promises)
      .then(function(data) {
        const zipFile = path.join(currentUploadDir, hash + ".zip");
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

        archive.directory(startingDirectory.replace(EXTRACTED_DIR, OPTIMIZED_DIR), false);

        archive.finalize();

        console.log(startingDirectory);
        console.log(startingDirectory.replace(EXTRACTED_DIR, OPTIMIZED_DIR));

        setTimeout(function() {
          size(startingDirectory, function(errInput, inputSize) {
            if(errInput) throw errInput;
            size(startingDirectory.replace(EXTRACTED_DIR, OPTIMIZED_DIR), function(errOutput, outputSize) {
              if(errOutput) throw errOutput;
              var stats = JSON.stringify({
                files: data.length,
                inputSize: inputSize,
                outputSize: outputSize,
                difference: inputSize - outputSize,
                ratio: outputSize / inputSize
              });
              resolve(stats);
            });
          });
        }, 5000);
      })
      .catch(err => {
        reject(err);
      });

    });

  }

  function fetchAPI(requestInfo, currentPath) {
    return fetch("http://localhost:3000/api/minify", requestInfo)
    .then(response => {
      var dest = currentPath.replace(EXTRACTED_DIR, OPTIMIZED_DIR);
      response.body.pipe(fs.createWriteStream(dest));
    })
    .catch(error => {
      console.log(error);
    });
  }

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
