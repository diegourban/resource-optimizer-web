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
const logger = require("winston");

// interno
const config = require("../../config/config");

module.exports = function(app) {

  const UPLOADS_DIR = path.join(os.tmpdir(), config.app.uploadsFolder);
  const EXTRACTED_FOLDER = config.app.extractedFolder;
  const OPTIMIZED_FOLDER = config.app.optimizedFolder;

  verificaDiretorioUpload();

  var uploader = multer({ dest: os.tmpdir() });

  app.post("/web/upload", uploader.single("projectFile"), function(req, res) {
    logger.info("POST recebido");

    if(!isValidMIMEType(req.file.mimetype)) {
      logger.warn("O MIME Type do arquivo enviado não é suportado: " + req.file.mimetype);
      return res.status(415).send("O arquivo selecionado não é suportado");
    }

    // criando uma pasta com nome único para esse upload
    const hash = generateHash();
    logger.info("Hash gerado: " + hash);

    const currentUploadDir = path.join(UPLOADS_DIR, hash);
    fs.mkdirSync(currentUploadDir);

    const currentExtractedDir = path.join(currentUploadDir, EXTRACTED_FOLDER);
    fs.mkdirSync(currentExtractedDir);

    fs.createReadStream(req.file.path).pipe(unzip.Extract({path: currentExtractedDir}))
    .on("close", function() {
      logger.info("Todos os dados foram extraídos");
      processDirectory(hash, currentUploadDir, currentExtractedDir)
      .then(function(stats) {
        var json = JSON.stringify({
          stats : JSON.parse(stats),
          hash: hash,
          url: "/web/download/" + hash
        });
        logger.info("Processo realizado com sucesso");
        logger.info("Resultado: " + json);
        res.end(json);
      })
      .catch(err => {
        logger.error("Erro inesperado: " + err);
        res.status(500).send("Oocrreu um erro inesperado");
      })
    });
  });

  app.get("/web/download/:hash", function(req, res) {
    const hash = req.params.hash;
    logger.info("GET recebido para " + hash);

    const zipFile = path.join(UPLOADS_DIR, hash, hash + ".zip");
    if(!fs.existsSync(zipFile)) {
      logger.warn("Arquivo não encontrado: " + zipFile);
      return res.status(404).send("Arquivo não encontrado");
    }

    res.sendFile(zipFile);
  });

  function verificaDiretorioUpload() {
    if (!fs.existsSync(UPLOADS_DIR)) {
      logger.warn("Diretório de uploads não encontrado");
      criarDiretorioUpload();
    }
  }

  function criarDiretorioUpload() {
    fs.mkdirSync(UPLOADS_DIR);
    logger.info("Diretório de uploads criado em: " + UPLOADS_DIR);
  }

  function isValidMIMEType(mimeType) {
    return config.app.acceptedMIMEType.includes(mimeType);
  }

  function processDirectory(hash, currentUploadDir, startingDirectory) {
    return new Promise(function(resolve, reject) {
      var stack = [startingDirectory];

      var promises = [];

      while (stack.length) {
        var currentPath = stack.pop();
        var currentFile = fs.statSync(currentPath);

        // dirtórios são adicionados na pilha
        if (currentFile.isDirectory()) {
          fs.mkdirSync(currentPath.replace(EXTRACTED_FOLDER, OPTIMIZED_FOLDER));
          fs.readdirSync(currentPath).forEach(function(p) {
              stack.push(currentPath + path.sep + p);
          });
        // arquivos são copiados ou otimizados
        } else {
          let extension = extensionToContentType(path.extname(currentPath));

          if(extension === "invalid") {
            fs.createReadStream(currentPath).pipe(fs.createWriteStream(currentPath.replace(EXTRACTED_FOLDER, OPTIMIZED_FOLDER)));
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
        var archive = archiver("zip");

        output.on("close", function () {
          logger.info("Archiver foi finalizado e o arquivo de saída foi fechado.");

          logger.info("Coletando estatísticas...");
          size(startingDirectory, function(errInput, inputSize) {
            if(errInput) throw errInput;
            size(startingDirectory.replace(EXTRACTED_FOLDER, OPTIMIZED_FOLDER), function(errOutput, outputSize) {
              if(errOutput) throw errOutput;
              var stats = JSON.stringify({
                files: data.length,
                inputSize: inputSize,
                outputSize: outputSize,
                difference: inputSize - outputSize,
                ratio: outputSize / inputSize
              });
              logger.info(stats);
              resolve(stats);
            });
          });
        });

        archive.on('error', function(err) {
          logger.error("Ocorreu um erro ao compactar o arquivo "  + err);
        });

        archive.pipe(output);

        archive.directory(startingDirectory.replace(EXTRACTED_FOLDER, OPTIMIZED_FOLDER), false);

        archive.finalize();
      })
      .catch(err => {
        reject(err);
      });

    });

  }

  function fetchAPI(requestInfo, currentPath) {
    return fetch("http://localhost:3000/api/minify", requestInfo)
    .then(response => {
      var dest = currentPath.replace(EXTRACTED_FOLDER, OPTIMIZED_FOLDER);
      response.body.pipe(fs.createWriteStream(dest));
    })
    .catch(error => {
      logger.error("Erro inesperado" + error);
    });
  }

  function generateHash() {
    const current_date = (new Date()).valueOf().toString();
    const random = Math.random().toString();
    return crypto.createHash("sha1").update(current_date + random).digest("hex");
  }

  function extensionToContentType(extension) {
    logger.info("Verificando validade da extensão: " + extension);

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
