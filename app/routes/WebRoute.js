const os = require("os");
const path = require("path");
const fs = require("fs");

const formidable = require("formidable");

module.exports = function(app) {

  const WEB_ENDPOINT = "/web/upload";
  const UPLOAD_DIR = path.join(os.tmpdir(), "/uploads");

  if (!fs.existsSync(UPLOAD_DIR)) {
    console.log('Criando diretório de upload ' + UPLOAD_DIR);
    fs.mkdirSync(UPLOAD_DIR);
  }

  app.post(WEB_ENDPOINT, function(req, res, next){
    var form = new formidable.IncomingForm();

    // define que é possível fazer upload de múltiplos arquivos num único request
    form.multiples = true;

    // para cada arquivo feito upload com sucesso,
    // renomeia para seu nome original,
    // minifica e armazena no arquivo .min
    form.on("file", function(field, file) {
      var extension = path.extname(file.name);
      console.log(extension);
      var basename = path.basename(file.name, extension);
      console.log(basename);
      var newPath = path.join(UPLOAD_DIR, file.name);
      fs.rename(file.path, newPath);
      console.log(newPath);

      if(extension === ".css") {
        // direcionar para a api
        /*
        new CssMinifier().minify([newPath])
          .then(function(output) {
            const basename_min = basename + '.min' + extension;
            fs.writeFile(path.join(UPLOAD_DIR, basename_min), output.styles, function(err) {
              if(err) {
                return console.log(err);
              }
              console.log("Arquivo salvo");
            });
          })
          .catch(function(err) {
            console.log("Ocorreu um erro na minificação: \n" + err);
            res.status(500).send(err);
          })
          */
      } else if(extension === ".html") {
        /*
        fs.readFile(newPath, 'utf-8', (err, data) => {
          if (err) throw err;
          console.log(data);
          var result = new HtmlMinifier().minify(data);

          const basename_min = basename + '.min' + extension;
          fs.writeFile(path.join(UPLOAD_DIR, basename_min), result, function(err) {
            if(err) {
              return console.log(err);
            }
            console.log("Arquivo salvo");
          })
        })
        */
      } else if(extension === ".js") {
        /*
        fs.readFile(newPath, 'utf-8', (err, data) => {
          if (err) throw err;
          console.log(data);
          var result = new JsMinifier().minify(data);

          const basename_min = basename + '.min' + extension;
          fs.writeFile(path.join(UPLOAD_DIR, basename_min), result.code, function(err) {
            if(err) {
              return console.log(err);
            }
            console.log("Arquivo salvo");
          })
        })
        */
      } else if(extension === ".jpg" || extension === ".png") {
        /*
        fs.readFile(newPath, (err, data) => {
          if (err) throw err;
          console.log(data);
          new ImageMinifier().minify(data)
            .then(function(output) {
              const basename_min = basename + '.min' + extension;
              fs.writeFile(path.join(UPLOAD_DIR, basename_min), result, function(err) {
                if(err) {
                  return console.log(err);
                }
                console.log("Arquivo salvo");
              })
            })
            .catch(function(err) {
              console.log("Ocorreu um erro na minificação: \n" + err);
            })
        })
        */
      }
    });

    form.on("error", function(err) {
      console.log("Ocorreu em erro: \n" + err);
    });

    form.on("end", function() {
      res.end("Sucesso");
    });

    form.parse(req);
  });

}
