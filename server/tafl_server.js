/* This is a minimalistic tafl server using socket.io */

// TODO: Rewrite the initialisation to be used behind apache
var io = require('socket.io').listen(47413);
var tafllib = require('../assets/www/js/tafl');
var tools = require('../assets/www/js/tools');
var tafl = tafllib.tafl;

var games = {};
var players = {};
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

	socket.on('client.hello', function(user_id) {
		// generate user-id
		if (! user_id) {
			user_id = generateRandomString(16);
		
			socket.emit('player.id.set', user_id);
		}
		
		socket.set('player.id', user_id);

		players[user_id] = socket;

		console.log("Got hello from " + user_id);
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
		
		var game_id = generateRandomString();

		socket2.emit('game.start', {your_color: 'W', board_id: game_id });
		socket.emit('game.start', {your_color: 'B', board_id: game_id });
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


