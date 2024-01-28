window.addEventListener("DOMContentLoaded", function() {
    // Grab elements, create settings, etc.
    var canvas1 = document.getElementById("canvas1"),
        context = canvas1.getContext("2d"),
        // we don't need to append the video1 to the document
        video1 = document.createElement("video1"),
        videoObj = 
        navigator.getUserMedia || navigator.mozGetUserMedia ? // our browser is up to date with specs ?
        { 
        video1: {
            width: { min: 1280,  max: 1280 },
               height: { min: 720,  max: 720 },
               require: ['width', 'height']
            }
        }:
        {
            video1: {
                mandatory: {
                    minWidth: 1280,
                    minHeight: 720,
                    maxWidth: 1280,
                    maxHeight: 720
                }
            }
        };
        

        errBack = function(error) {
            console.log("video1 capture error: ", error.code); 
        };
    // create a crop object that will be calculated on load of the video1
    var crop;
    // create a variable that will enable us to stop the loop.
    var raf;
    
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    // Put video1 listeners into place
        navigator.getUserMedia(videoObj, function(stream1) {
            video1.src = URL.createObjectURL(stream1);
            video1.onplaying = function(){
                var croppedWidth = ( Math.min(video1.videoHeight, canvas1.height) / Math.max(video1.videoHeight,canvas1.height)) * Math.min(video1.videoWidth, canvas1.width),
                croppedX = ( video1.videoWidth - croppedWidth) / 2;
                crop = {w:croppedWidth, h:video1.videoHeight, x:croppedX, y:0};
                // call our loop only when the video1 is playing
                raf = requestAnimationFrame(loop);
                };
            video1.onpause = function(){
                // stop the loop
                cancelAnimationFrame(raf);
                }
            video1.play();
        }, errBack);

    function loop(){
       context.drawImage(video1, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas1.width, canvas1.height);
       raf = requestAnimationFrame(loop);
    }
// now that our video is drawn correctly, we can do...
context.translate(canvas1.width, 0);
context.scale(-1,1);

}, false);