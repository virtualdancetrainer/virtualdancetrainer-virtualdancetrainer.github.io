
  
  var start = function(){
      var video1 = document.getElementById('video'),
       vendorUrl = window.URL || window.webkitURL;
  
      if (navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ video: true })
          .then(function (stream) {
            video1.srcObject = stream;
          }).catch(function (error) {
            console.log("Something went wrong!");
          });
      }
  }
  $(function() {
      start();
  });