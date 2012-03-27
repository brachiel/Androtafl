/* This is a minimalistic tafl server using socket.io */

// TODO: Rewrite the initialisation to be used behind apache
var io = require('socket.io').listen(47413);
var tafllib = require('../assets/www/js/tafl');
var tafl = tafllib.tafl;

var games = {};
var sockets_waiting = [];

var ready = function(socket) { socket.emit('ready'); };

io.sockets.on('connection', function(socket) {
	socket.emit('server.hello');

	socket.on('game.join', function(game_id) {
		if (! games[game_id]) {
			socket.emit('error');
			return;
		}

		socket.set('game.id', game_id, ready(socket));
	});

	socket.on('client.hello', function() {
		console.log("Got hello");
	});

	socket.on('game.find_opponent', function() {
		console.log("Looking for opponent...");
		if (sockets_waiting.length == 0) {
			sockets_waiting.push(socket);
			return;
		}

		var socket2 = sockets_waiting.pop();

		// TODO: Create TaflState and assign it to the game

		socket.opponent = socket2;
		socket2.opponent = socket;

		socket2.emit('game.start', {your_color: 'W'});
		socket.emit('game.start', {your_color: 'B'});
	});

	socket.on('board.get', function() {
		socket.get('game.id', function(err, game_id) {
			if (err) { socket.emit('error', err); return; }
			if (! games[game_id]) { socket.emit('error', 'no such game'); return; };

			socket.emit('board', game[game_id].board);
		});
	});

	socket.on('move.send', function(move) {
		// TODO: Check if move is valid
		socket.opponent.emit('move.new', move);
	});
});


