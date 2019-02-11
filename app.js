'use strict';

const express = require('express');
const app = express();
const server = app.listen(process.env.PORT || 4000, () => console.log("Server started on port 4000"));
const path = require('path');
const io = require('socket.io')(server);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});


io.on('connection', function (socket) {
    function log(message) {
        socket.emit('log', message);
    }

    socket.on('message', function (message) {
        socket.broadcast.emit('message', message);
        log('Client said: ' + message);
    })

    socket.on('create or join', function (room) {
        log('Received request to create or join room ' + room);

        let clientsInRoom = io.sockets.adapter.rooms[room];
        let numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;

        log('Room ' + room + ' now has ' + numClients + ' client(s)');

        if (numClients === 0) {
            socket.join(room);
            log('Client ID ' + socket.id + ' created room ' + room)
            socket.emit('created', room, socket.id);
        } else if (numClients === 1) {
            io.sockets.in(room).emit('join', room);
            socket.join(room);
            log('Client ID ' + socket.id + ' joined room ' + room);
            socket.emit('joined', room, socket.id);
            io.sockets.in(room).emit('ready');
        } else {
            socket.emit('full', room);
        }
    })

    socket.on('bye', function () {
        console.log('received bye');
    });
})

app.use('/static', express.static(path.join(__dirname, 'static')));