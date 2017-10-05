$('.btn-upload').on('click', function (){
    $('#input-upload').click();
    $('.progress-bar').text('0%');
    $('.progress-bar').width('0%');
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
              $('.progress-bar').html('Done');
            }

          }

        }, false);

        return xhr;
      }
    });

  }
});
