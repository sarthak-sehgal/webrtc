'use strict';

const express = require('express');
const path = require('path');

const app = express();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.use('/static', express.static(path.join(__dirname, 'static')))

app.listen(4000, () => console.log("Server started on port 4000"));