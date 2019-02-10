'use strict';

let isInitiator = false;
let isChannelReady = false;
let isStarted = false;
let localStream;
let remoteStream;
let pc; // peer connection
const pcConfig = {
    'iceServers': [{
        'urls': 'stun:stun.l.google.com:19302'
    }]
};
const sdpConstraints = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
};
const socket = io.connect();
const room = "room";


socket.emit('create or join', room);

socket.on('created', function (room) {
    console.log("Created room " + room);
    isInitiator = true;
});

socket.on('full', function (room) {
    console.log("Room " + room + " is full!");
})

socket.on('join', function (room) {
    console.log('A peer made a request to join room ' + room);
    console.log("This peer is the initiator of room " + room + "!");
    isChannelReady = true;
})

socket.on('joined', function (room, clientId) {
    console.log("Joined: " + room);
    isChannelReady = true;
})

socket.on('log', function (message) {
    console.log(message);
})

function sendMessage(message) {
    console.log("Client sending message: ", message);
    socket.emit("message", message);
}

socket.on("message", function (message) {
    console.log("Client received message: ", message);
    if (message === "got user media") {
        maybeStart();
    } else if (message.type === "offer") {
        if (!isInitiator && !isStarted) {
            maybeStart();
        }
        pc.setRemoteDescription(new RTCSessionDescription(message));
        doAnswer();
    } else if (message.type === "answer" && isStarted) {
        pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === "candidate" && isStarted) {
        let candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });
        pc.addIceCandidate(candidate);
    } else if (message === "bye" && isStarted) {
        handleRemoteHangup();
    }
})

const localVideo = document.getElementById("myVid");
const remoteVideo = document.getElementById("remoteVideo");
const constraints = {
    video: true,
    audio: true
};

navigator.mediaDevices.getUserMedia(constraints)
    .then(gotLocalMediaStream)
    .catch(err => {
        document.getElementById("container").innerHTML = `<h2>Error occurred while getting input devices! ${err}</h3>`;
        console.log(err);
    })

function gotLocalMediaStream(stream) {
    localVideo.srcObject = stream;
    localStream = stream;
    sendMessage("got user media");
    console.log("Received local stream.");
    if (isInitiator) {
        maybeStart();
    }
}

function maybeStart() {
    console.log("Maybe start. State: ", isStarted, localStream, isChannelReady);
    if (!isStarted && typeof localStream !== "undefined" && isChannelReady) {
        createPeerConnection();
        pc.addStream(localStream);
        isStarted = true;
        console.log("isInitiator: ", isInitiator);
        if (isInitiator) {
            doCall();
        }
    }
}

window.onbeforeunload = function () {
    sendMessage("bye");
}

function createPeerConnection() {
    console.log("Creating peer connection...");
    try {
        pc = new RTCPeerConnection(null);
        pc.onicecandidate = handleIceCandidate;
        pc.onaddstream = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
        console.log("Created RTCPeerConnection");
    } catch (err) {
        console.log("Failed to create PeerConnection: ", err.message);
        return;
    }
}

function handleIceCandidate(e) {
    console.log("iceCandidate event: ", e);
    if (e.candidate) {
        sendMessage({
            type: "candidate",
            label: e.candidate.sdpMLineIndex,
            id: e.candidate.sdpMid,
            candidate: e.candidate.candidate
        });
    } else {
        console.log("End of candidates!");
    }
}

function doCall() {
    console.log("Sending offer to peer");
    pc.createOffer(setLocalAndSendMessage, error => console.log('createOffer() error: ', error));
}

function doAnswer() {
    console.log("Sending answer to peer.");
    pc.createAnswer().then(
        setLocalAndSendMessage,
        error => console.log('doAnswer() error: ', error)
    )
}

function setLocalAndSendMessage (sessionDescription) {
    pc.setLocalDescription(sessionDescription);
    console.log("setLocalAndSendMessage sending message", sessionDescription);
    sendMessage(sessionDescription);
}

function handleRemoteStreamAdded (e) {
    console.log("Remote stream added.");
    remoteStream = e.stream;
    remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved (e) {
    console.log("Remote stream removed. Event: ", e);
}

function hangup () {
    console.log("Hanging up.");
    stop();
    sendMessage("bye");
}

function handleRemoteHangup () {
    console.log("Remote hanged up.");
    stop();
    isInitiator = true;
}

function stop () {
    isStarted = false;
    pc.close();
    pc = null;
}