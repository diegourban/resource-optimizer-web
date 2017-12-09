// node
const os = require("os");
const path = require("path");
const fs = require("fs");

// externo
const unzip = require("unzip");
const multer = require("multer");
const logger = require("winston");

// interno
const config = require("../../config/config");
const hashutils = require("../utils/hash");
const dirutils = require("../utils/dir");
const mimeutils = require("../utils/mime");

module.exports = function(app) {

  const UPLOADS_DIR = path.join(os.tmpdir(), config.app.uploadsFolder);
  const EXTRACTED_FOLDER = config.app.extractedFolder;

  dirutils.verificaDiretorioUpload(UPLOADS_DIR);

  var uploader = multer({ dest: os.tmpdir() });

  app.post("/web/upload/project", uploader.single(config.app.uploadName), function(req, res) {
    logger.info("POST recebido");

    var options = {
      pngQuality: req.query.pngQuality,
      jpegQuality: req.query.jpegQuality
    };

    if(!mimeutils.isValidMIMEType(req.file.mimetype)) {
      logger.warn("O MIME Type do arquivo enviado não é suportado: " + req.file.mimetype);
      return res.status(415).send("O arquivo selecionado não é suportado");
    }

    // criando uma pasta com nome único para esse upload
    const hash = hashutils.generateHash();
    logger.info("Hash gerado: " + hash);

    const currentUploadDir = path.join(UPLOADS_DIR, hash);
    fs.mkdirSync(currentUploadDir);

    const currentExtractedDir = path.join(currentUploadDir, EXTRACTED_FOLDER);
    fs.mkdirSync(currentExtractedDir);

    fs.createReadStream(req.file.path).pipe(unzip.Extract({path: currentExtractedDir}))
    .on("close", function() {
      logger.info("Todos os dados foram extraídos");

      dirutils.processDirectory(hash, currentUploadDir, options)
      .then(function(stats) {
        logger.info("Processo realizado com sucesso");

        var json = JSON.stringify({
          stats : JSON.parse(stats),
          hash: hash,
          url: "/web/download/" + hash
        });

        res.end(json);
      })
      .catch(err => {
        logger.error("Erro inesperado ao processar o arquivo: " + err);
        res.status(500).send("Ocorreu um erro inesperado ao processar o arquivo");
      })
    });
  });

  app.post("/web/upload/files", uploader.array("files"), function(req, res) {
    logger.info("POST recebido");

    var options = {
      quality: req.query.quality
    };

    /*
    if(!mimeutils.isValidMIMEType(req.file.mimetype)) {
      logger.warn("O MIME Type do arquivo enviado não é suportado: " + req.file.mimetype);
      return res.status(415).send("O arquivo selecionado não é suportado");
    }*/

    // criando uma pasta com nome único para esse upload
    const hash = hashutils.generateHash();
    logger.info("Hash gerado: " + hash);

    const currentUploadDir = path.join(UPLOADS_DIR, hash);
    fs.mkdirSync(currentUploadDir);

    const currentExtractedDir = path.join(currentUploadDir, EXTRACTED_FOLDER);
    fs.mkdirSync(currentExtractedDir);

    console.log(req.files);

    var promises = [];

    req.files.forEach(function(file) {
      console.log(file.path);
      var promise = new Promise(function(resolve, reject) {
        fs.createReadStream(file.path)
        .pipe(fs.createWriteStream(path.join(currentExtractedDir, file.originalname)))
        .on("finish", function() {
          resolve();
        });
      });
      promises.push(promise);
    });

    Promise.all(promises)
    .then(function(data) {
      logger.info("Todos os dados foram extraídos");

      dirutils.processDirectory(hash, currentUploadDir, options)
      .then(function(stats) {
        logger.info("Processo realizado com sucesso");

        var json = JSON.stringify({
          stats : JSON.parse(stats),
          hash: hash,
          url: "/web/download/" + hash
        });

        res.end(json);
      })
      .catch(err => {
        logger.error("Erro inesperado ao processar o arquivo: " + err);
        res.status(500).send("Ocorreu um erro inesperado ao processar o arquivo");
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

}
