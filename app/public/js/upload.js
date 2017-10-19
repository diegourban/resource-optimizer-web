$(".btn-upload").on("click", function (){
    $("#input-upload").click();
    $(".progress-bar").text("0%");
    $(".progress-bar").width("0%");
});

$("#input-upload").on("change", function(){

  var files = $(this).get(0).files;

  if (files.length > 0){
    // Cria uma objeto FormData que vai ser enviado com o request
    var formData = new FormData();

    for (var i = 0; i < files.length; i++) {
      var file = files[i];

      // adiciona cada arquivo no formData
      formData.append("projectFile", file, file.name);
    }

    $.ajax({
      url: "/web/upload",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function(data){
        console.log("Upload feito com sucesso!\n" + data);
        var datap = JSON.parse(data);
        console.log(datap.hash);
        exibirBotaoDownload(datap.url);
      },
      xhr: function() {
        var xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", function(evt) {

          if (evt.lengthComputable) {
            var percentComplete = evt.loaded / evt.total;
            percentComplete = parseInt(percentComplete * 100);

            // atualizando a barra de progresso
            $("#progress-bar-upload").text(percentComplete + "%");
            $("#progress-bar-upload").width(percentComplete + "%");

            if (percentComplete === 100) {
              $("#progress-bar-upload").html("Otimizando...");
            }
          }
        }, false);

        return xhr;
      }
    });

  }
});

function exibirBotaoDownload(urlDownload) {
  $("#progress-bar-upload").removeClass("progress-bar-striped active");
  $("#progress-bar-upload").html("Finalizado");
  $("#area-download .btn-download").attr("href", "http://localhost:3001" + urlDownload);
  $("#area-download").show(1000);
}
