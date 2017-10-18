var query = window.location.search.substring(1)
console.log(query);
var hash = query.split("hash=")[1];
console.log(hash);

function pollRequest(hash) {
  console.log("refresh");
  console.log("calling " + hash);
  fetch("/web/download/" + hash)
  .then(function(response) {
    console.log(response);
    if(response.ok) {
      console.log("recebendo");
    } else if(response.status === 404) {
      setTimeout(pollRequest, 5000, hash);
    }
  })
  .catch(function(error) {
    console.log('There has been a problem with your fetch operation: ' + error.message);
  });;
}

setTimeout(pollRequest, 5000, hash);

$('.btn-download').on('click', function (){
  console.log('download');
});

$('#input-upload').on('change', function(){

  var files = $(this).get(0).files;

  if (files.length > 0){
    // Cria uma objeto FormData que vai ser enviado com o request
    var formData = new FormData();

    for (var i = 0; i < files.length; i++) {
      var file = files[i];

      // adiciona cada arquivo no formData
      formData.append('uploads', file, file.name);
    }

    $.ajax({
      url: '/web/upload',
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(data){
        console.log('Upload feito com sucesso!\n' + data);
        var datap = JSON.parse(data);
        console.log(datap.hash);
        //window.location.href = "/" + datap.hash;
      },
      xhr: function() {
        var xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', function(evt) {

          if (evt.lengthComputable) {
            var percentComplete = evt.loaded / evt.total;
            percentComplete = parseInt(percentComplete * 100);

            // atualizando a barra de progresso
            $('.progress-bar').text(percentComplete + '%');
            $('.progress-bar').width(percentComplete + '%');

            if (percentComplete === 100) {
              $('.progress-bar').html('Arquivo enviado com sucesso.');
            }

          }

        }, false);

        return xhr;
      }
    });

  }
});
