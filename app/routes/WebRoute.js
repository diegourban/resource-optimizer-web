// node
const os = require("os");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// externo
const unzip = require("unzip");
const formidable = require("formidable");
const fetch = require("node-fetch");
const archiver = require("archiver");

module.exports = function(app) {
  
  const uploadsDir = path.join(os.tmpdir(), "/uploads");
  const EXTRACTED_DIR = "__extracted";
  const OPTIMIZED_DIR = "__optimized";

  if (!fs.existsSync(uploadsDir)) {
    console.log('Criando diretório de upload comum: ' + uploadsDir);
    fs.mkdirSync(uploadsDir);
  }

  app.post("/web/upload", function(req, res) {
    var form = new formidable.IncomingForm();

    // criando uma pasta com nome único
    const hash = generateHash();
    const currentUploadDir = path.join(uploadsDir, hash);
    fs.mkdirSync(currentUploadDir);

    const currentExtractedDir = path.join(currentUploadDir, EXTRACTED_DIR);
    fs.mkdirSync(currentExtractedDir);

    form.on("file", function(field, file) {
      // para cada arquivo feito upload com sucesso,
      var extension = path.extname(file.name);
      var basename = path.basename(file.name, extension);
      var newPath = path.join(currentExtractedDir, file.name);

      fs.createReadStream(file.path).pipe(unzip.Extract({path: currentExtractedDir}))
      .on("close", function() {
        console.log('All the data in the file has been read');
        processDirectory(hash, currentUploadDir, currentExtractedDir);
      });
    });

    form.on("error", function(err) {
      console.log("Ocorreu em erro: \n" + err);
    });

    form.on("end", function() {
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

  function processDirectory(hash, currentUploadDir, startingDirectory) {
    var stack = [startingDirectory];

    var promises = [];

    while (stack.length) {
      var currentPath = stack.pop();
      var currentFile = fs.statSync(currentPath);

      // if it's a directory,
      // put the contents in our stack
      if (currentFile.isDirectory()) {
        fs.mkdirSync(currentPath.replace(EXTRACTED_DIR, OPTIMIZED_DIR));
        fs.readdirSync(currentPath).forEach(function(p) {
            stack.push(currentPath + path.sep + p);
        });
      // if it's a file
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

          // envia para a API
          let fetchCall = fetchAPI(requestInfo, currentPath);
          promises.push(fetchCall);
        }
      }
    }

    Promise.all(promises).then(function() {
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
    }, function(err) {
      console.log(err);
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
