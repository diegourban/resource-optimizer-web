$(".btn-upload").on("click", function () {
  $("#input-upload").val("");
  esconderAreaDownload();
  $("#input-upload").click();
  $(".progress-bar").text("0%");
  $(".progress-bar").width("0%");
});

$("#input-upload").on("change", function() {

  var files = $(this).get(0).files;

  if (files.length > 0) {
    // Cria uma objeto FormData que vai ser enviado com o request
    var formData = new FormData();

    for (var i = 0; i < files.length; i++) {
      var file = files[i];

      // adiciona cada arquivo no formData
      formData.append("projectFile", file, file.name);
    }

    var quality = $('input[name=quality]:checked').val();
    var lossless = $("#jpegLossless").is(':checked');
    var queryParams = "quality=" + quality + "&lossless=" + lossless;

    $.ajax({
      url: "/web/upload?" + queryParams,
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function(data){
        habilitarEntrada();
        console.log("Upload feito com sucesso!\n" + data);
        var result = JSON.parse(data);
        console.log(result);
        exibirAreaDownload(result);
      },
      error: function(xhr) {
        habilitarEntrada();
        console.log(xhr.status);
        console.log(xhr.statusText);
        console.log(xhr.responseText);
        exibirMensagemErro(xhr);
      },
      xhr: function() {
        desabilitarEntrada();
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

function habilitarEntrada() {
  controlarInteracao(false);
}

function desabilitarEntrada() {
  controlarInteracao(true);
}

function controlarInteracao(disabled) {
  $(".disableable").prop('disabled', disabled);
}

function esconderAreaDownload() {
  $("#area-download").hide(1000);
  $("#progress-bar-upload").addClass("progress-bar-striped active");
  $("#progress-bar-upload").removeClass("progress-bar-danger progress-bar-success");
}

function exibirAreaDownload(result) {
  $("#span-total-arquivos").text(result.stats.files + " arquivos otimizados");
  $("#span-espaco").text((result.stats.difference / 1024).toFixed(2)  + " KB a menos");
  $("#span-percentagem").text("Economia de " + (100 - (100 * result.stats.ratio)).toFixed(2) + "%");
  $("#progress-bar-upload").removeClass("progress-bar-striped active");
  $("#progress-bar-upload").addClass("progress-bar-success");
  $("#progress-bar-upload").html("Finalizado");
  $("#area-download .btn-download").attr("href", "http://localhost:3001" + result.url);
  $("#area-download").show(1000);
}

function exibirMensagemErro(xhr) {
  $("#progress-bar-upload").removeClass("progress-bar-striped active");
  $("#progress-bar-upload").addClass("progress-bar-danger");
  $("#progress-bar-upload").html(xhr.responseText);
}
