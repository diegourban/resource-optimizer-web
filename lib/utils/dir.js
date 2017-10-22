const fs = require("fs");
const path = require("path");

const logger = require("winston");
const archiver = require("archiver");
const size = require("get-folder-size");

const config = require("../../config/config");
const extensionutils = require("./extension");
const fetchutils = require("./fetch");

exports.verificaDiretorioUpload = function(uploadDir) {
  if (!fs.existsSync(uploadDir)) {
    logger.warn("Diretório de uploads não encontrado");
    criarDiretorioUpload(uploadDir);
  }
}

function criarDiretorioUpload(uploadDir) {
  fs.mkdirSync(uploadDir);
  logger.info("Diretório de uploads criado em: " + uploadDir);
}

exports.processDirectory = function(hash, currentUploadDir) {
  return new Promise(function(resolve, reject) {
    var extactedPath = path.join(currentUploadDir, config.app.extractedFolder);
    var optimizedPath = path.join(currentUploadDir, config.app.optimizedFolder);

    var stack = [extactedPath];

    var promises = [];

    while (stack.length) {
      var currentExtractedPath = stack.pop();

      // substitui __extracted por __optimized no path
      var currentOptimizedPath = currentExtractedPath.replace(config.app.extractedFolder, config.app.optimizedFolder);

      var currentStat = fs.statSync(currentExtractedPath);

      if (currentStat.isDirectory()) {
        // adicionar os filhos na pilha
        fs.readdirSync(currentExtractedPath).forEach(function(p) {
          stack.push(path.join(currentExtractedPath, p));
        });

        // cria a pasta espelho na saída __optimized
        fs.mkdirSync(currentOptimizedPath);
      } else {
        let extension = path.extname(currentExtractedPath);

        // arquivos são copiados ou otimizados
        if(extensionutils.isValidExtension(extension)) {
          // envia para a API otimizar e guarda a promise
          let fetchCall = fetchutils.fetchAPI(currentExtractedPath, currentOptimizedPath);
          promises.push(fetchCall);
        } else {
          // apenas copia
          fs.createReadStream(currentExtractedPath).pipe(fs.createWriteStream(currentOptimizedPath));
        }
      }
    }

    // Aguardando todas as promises resolverem
    Promise.all(promises)
    .then(function(data) {
      const zipFile = path.join(currentUploadDir, hash + ".zip");
      var output = fs.createWriteStream(zipFile);
      var archive = archiver("zip");

      output.on("close", function () {
        logger.info("Archiver foi finalizado e o arquivo de saída foi fechado.");

        logger.info("Coletando estatísticas...");
        size(extactedPath, function(errInput, inputSize) {
          if(errInput) throw errInput;

          size(optimizedPath, function(errOutput, outputSize) {
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

      archive.on("error", function(err) {
        logger.error("Ocorreu um erro ao compactar o arquivo.\n"  + err);
      });

      archive.pipe(output);

      archive.directory(optimizedPath, false);

      archive.finalize();
    })
    .catch(err => {
      logger.error("Ocorreu um erro inesperado.\n" + err);
      reject(err);
    });
  });
}
