const localVideo = document.getElementById("myVid");
const remoteVideo = document.getElementById("remoteVideo");
const startButton = document.getElementById("startButton");
const callButton = document.getElementById("callButton");
const hangButton = document.getElementById("hangButton");
const stopButton = document.getElementById("stopButton");
const constraints = {
    video: true
}
const offerOptions = {
    offerToReceiveVideo: 1,
};

callButton.disabled = true;
hangButton.disabled = true;
stopButton.disabled = true;

let localStream;
let remoteStream;
let localPeerConnection;
let remotePeerConnection;


startButton.addEventListener('click', startVideo);
callButton.addEventListener('click', callHandler);
hangButton.addEventListener('click', hangHandler);
stopButton.addEventListener('click', stopHandler);

function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function gotLocalMediaStream(stream) {
    localVideo.srcObject = stream;
    localStream = stream;
    trace("Received local stream.");
    callButton.disabled = false;
}

function startVideo() {
    startButton.disabled = true;
    stopButton.disabled = false;
    if (hasGetUserMedia()) {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(gotLocalMediaStream)
            .catch(err => {
                document.getElementById("container").innerHTML = `<h2>Error occurred while getting input devices! ${err}</h3>`;
                trace(err);
            })
    } else {
        document.getElementById("container").innerHTML = "<h2>Your browser does not support WebRTC</h3>";
        trace("Browser does not support WebRTC");
    }
}

// negotiation
function handleConnection(e) {
    const peerConnection = e.target;
    const iceCandidate = e.candidate;

    if (iceCandidate) {
        // Negotiate to send the candidate to the remote peer
        trace("Negotiaiton begins...");

        // create new candidate with ICE config
        const newIceCandidate = new RTCIceCandidate(iceCandidate);
        const otherPeer = getOtherPeer(peerConnection);

        otherPeer.addIceCandidate(newIceCandidate)
            .then(() => {
                trace(`${getPeerName(peerConnection)} addIceCandidate success.`);
            })
            .catch((err) => {
                trace(`${getPeerName(peerConnection)} addIceCandidate failed. ${err.toString()}`);
            })
    } else {
        // all ICE candidates have been sent
    }
}

function getPeerName(peerConnection) {
    return (peerConnection === localPeerConnection) ? "localPeerConnection" : "remotePeerConnection";
}

function getOtherPeer(peerConnection) {
    return (peerConnection === localPeerConnection) ? remotePeerConnection : localPeerConnection;
}

function gotRemoteMediaStream(e) {
    const mediaStream = e.stream;
    remoteVideo.srcObject = mediaStream;
    remoteStream = mediaStream;
    trace("Remote peer connection received remote stream.");
}

function setSDPError(error) {
    trace(`Failed to create session description: ${error.toString()}.`);
}

function setLocalDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

function setRemoteDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

function setDescriptionSuccess(peerConnection, functionName) {
    const peerName = getPeerName(peerConnection);
    trace(`${peerName} ${functionName} complete.`);
}

function createdOffer(description) {
    trace("Offer from localPeerConnection:\n" + description.sdp);

    trace("localPeerConnection setLocalDescription start.");
    localPeerConnection.setLocalDescription(description)
        .then(() => {
            setLocalDescriptionSuccess(localPeerConnection);
        })
        .catch(setSDPError);

    trace('remotePeerConnection setRemoteDescription start.');
    remotePeerConnection.setRemoteDescription(description)
        .then(() => {
            setRemoteDescriptionSuccess(remotePeerConnection);
        })
        .catch(setSDPError);

    trace('remotePeerConnection createAnswer start.');
    remotePeerConnection.createAnswer()
        .then(createdAnswer)
        .catch(setSDPError);
}

function createdAnswer(description) {
    trace(`Answer from remotePeerConnection:\n${description.sdp}.`);

    trace("remotePeerConnection setLocalDescription start.");
    remotePeerConnection.setLocalDescription(description)
        .then(() => {
            setLocalDescriptionSuccess(remotePeerConnection);
        })
        .catch(setSDPError);

    trace("localPeerConnection setRemoteDescription start.");
    localPeerConnection.setRemoteDescription(description)
        .then(() => {
            setLocalDescriptionSuccess(localPeerConnection);
        })
        .catch(setSDPError);
}

function callHandler() {
    callButton.disabled = true;
    hangButton.disabled = false;

    trace("Calling now...");

    const servers = null; // RTC server config

    localPeerConnection = new RTCPeerConnection(servers);
    trace("Created local RTC peer connection object localPeerConnection");

    localPeerConnection.addEventListener('icecandidate', handleConnection);
    // localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);

    remotePeerConnection = new RTCPeerConnection(servers);
    trace("Created remote RTC peer connection object remotePeerConnection");

    remotePeerConnection.addEventListener('icecandidate', handleConnection);
    // remotePeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);
    remotePeerConnection.addEventListener('addstream', gotRemoteMediaStream);

    // Add local stream to rtc peer connection and create offer
    localPeerConnection.addStream(localStream);
    trace("Added local stream to localPeerConnection");

    trace("localPeerConnection create offer start");
    localPeerConnection.createOffer(offerOptions)
        .then(createdOffer)
        .catch(setSDPError);
}

function hangHandler() {
    if (localPeerConnection)
        localPeerConnection.close();
    if (remotePeerConnection)
        remotePeerConnection.close();
    localPeerConnection = null;
    remotePeerConnection = null;
    hangButton.disabled = true;
    callButton.disabled = false;
    trace('Ending call.');
}

function stopHandler() {
    hangHandler();
    localStream.getVideoTracks()[0].stop();
    callButton.disabled = true;
    startButton.disabled = false;
    stopButton.disabled = true;
}

function trace(text) {
    const now = (window.performance.now() / 1000).toFixed(3);
    console.log(text, now);
}