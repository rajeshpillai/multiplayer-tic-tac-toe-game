var express = require('express'),
    app = express(),
    http = require('http'),
    socketIO = require('socket.io'),
    server, io;

app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

server = http.Server(app);
let port = 5000;

server.listen(port, function () {
    console.log(`Tic-tac-toe game server running on port ${port}`);
});

io = socketIO(server);

var players = {},
    unmatched;

function joinGame (socket) {

    // Add the player to our object of players
    players[socket.id] = {

        // The opponent will either be the socket that is
        // currently unmatched, or it will be null if no
        // players are unmatched
        opponent: unmatched,

        // The symbol will become 'O' if the player is unmatched
        symbol: 'X',

        // The socket that is associated with this player
        socket: socket
    };

    // Every other player is marked as 'unmatched', which means
    // there is no another player to pair them with yet. As soon
    // as the next socket joins, the unmatched player is paired with
    // the new socket and the unmatched variable is set back to null
    if (unmatched) {
        players[socket.id].symbol = 'O';
        players[unmatched].opponent = socket.id;
        unmatched = null;
    } else {
        unmatched = socket.id;
    }
}

// Returns the opponent socket
function getOpponent (socket) {
    if (!players[socket.id].opponent) {
        return;
    }
    return players[
        players[socket.id].opponent
    ].socket;
}

io.on('connection', function (socket) {
    console.log("Connection established...", socket.id);
    joinGame(socket);

    // Once the socket has an opponent, we can begin the game
    if (getOpponent(socket)) {
        socket.emit('game.begin', {
            symbol: players[socket.id].symbol
        });
        getOpponent(socket).emit('game.begin', {
            symbol: players[getOpponent(socket).id].symbol
        });
    }

    // Listens for a move to be made and emits an event to both
    // players after the move is completed
    socket.on('make.move', function (data) {
        if (!getOpponent(socket)) {
            return;
        }
        console.log("Move made by : ", data);
        socket.emit('move.made', data);
        getOpponent(socket).emit('move.made', data);
    });

    // Emit an event to the opponent when the player leaves
    socket.on('disconnect', function () {
        if (getOpponent(socket)) {
            getOpponent(socket).emit('opponent.left');
        }
    });
});
