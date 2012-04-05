

var TaflNet = {
		connect: function(address) {
			if (!address) address = "chrummibei.ch:47413";
			
			var s = io.connect("http://"+address);
			
			this.socket = s;
			
			s.on('connect', function() {
				s.emit('client.hello');
			});
			
			s.on('server.hello', function(data) {
				s.emit('game.find_opponent');
			});
			
			s.on('game.start', function(data) {
				TaflNet.on_game_start(data);
			});
			
			s.on('move.new', function(move) {
				TaflNet.on_move(move);
			});
			
			s.on('game.end', function(data) {
				TaflNet.on_game_end(data);
			});
		},
		
		send_move: function(move) {
			var s = this.socket;
			if (! s)
				throw "NotConnected";
			s.emit('move.send', move);
		},
		
		on_game_start: function(data) {},
		on_move: function(move) {},
		on_game_end: function(data) {}
};