function hasGetUserMedia () {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

if(hasGetUserMedia()) {
    const vid = document.getElementById("myVid");
    const constraints = {
        video: true,
        audio: true
    }
    navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => vid.srcObject = stream)
    .catch(err => {
        document.getElementById("container").innerHTML = `<h2>Error occurred while getting input devices! ${err}</h3>`;
    })
} else {
    document.getElementById("container").innerHTML = "<h2>Your browser does not support WebRTC</h3>";
}