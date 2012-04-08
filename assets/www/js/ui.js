
//Test
//TaflUnitTest();


var uisettings = {
	notification: {
		vibrate: true,
		vibrate_length: 200, // in ms
		beep: true,
		beep_times: 1,
	},
};

var storage = {
	store: function(key, value) {
		localStorage.setItem(key, JSON.stringify(value));
	},
	
	get: function(key, deflt) {
		var value = localStorage.getItem(key);
		
		return (value !== null)?JSON.parse(value):deflt;
	},
	
	remove: function(key) {
		localStorage.removeItem(key);
	},
	
	save_game: function(safegame) {
		var games = storage.get('open_games', []);
		var has_gameid = false;
		for (var i = 0; i < games.length; ++i) {
			if (games[i].id === safegame.game_id) {
				has_gameid = true;
				
				games[i].turn = safegame.game_state.move_history.length;
				
				break;
			}
		}
		
		if (has_gameid === false) {
			games.push({id: safegame.game_id, name: safegame.game_name, turn: safegame.game_state.move_history.length});
			storage.store('open_games', games);
		}
		
		storage.store('safegame_' + safegame.game_id, safegame);
	},
};

// Hook up listeners to save game state if we're shut down
document.addEventListener("pause", killNet, false);
document.addEventListener("offline", killNet, false);


/* Create special boardui objects that handles ui related game functions */
var boardui = {
	moveFrom: null,
	my_color: null,
	activeField: null,
	active_field: null,
	
	game_state: null,
	network_game: false,
	
	game_name: 'Unnamed game',
	game_id: null,
	
	board_size_fixed: false,
	
	is_ai: {'W': false, 'B': false },
		
	init: function() {
		if (boardui.board_size_fixed === false) {
			console.log("Board size fix");
			boardui.fix_board_size();
			boardui.board_size_fixed = true;
		}
	},
	
	load_state: function(game_state) {
		if (! game_state) {
			game_state = boardui.create_new_state();
		} else {
			// Make sure game_state is a TaflState
			game_state.__proto__ = TaflState.prototype;
		}
		
		boardui.game_state = game_state;
		boardui.fill_board(game_state.board);
	},
	
	save_game: function() {
		if (! boardui.game_id) {
			boardui.game_id = generateRandomString();
		}

		var safegame = {};
		safegame.my_color = boardui.my_color;
		safegame.game_id = boardui.game_id;
		safegame.game_name = boardui.game_name;
		safegame.is_ai = boardui.is_ai;
		safegame.network_game = boardui.network_game;
		
		// Get rid of legal_move_cache before storing
		boardui.game_state.legal_move_cache = null;
		safegame.game_state = boardui.game_state;
		
		storage.save_game(safegame);
	},
	
	load_game: function(safegame) {
		boardui.my_color = safegame.my_color;
		boardui.game_id = safegame.game_id;
		boardui.game_name = safegame.game_name;
		boardui.is_ai = safegame.is_ai;
		boardui.network_game = safegame.network_game;
		
		boardui.moveFrom = null;
		boardui.deactivate();
		
		boardui.load_state(safegame.game_state);
	},
	
	create_new_state: function() {
		game_state = new TaflState();
		game_state.loadBoard(Tafl.initialStates.Hnefatafl.board());
		game_state.to_move = Tafl.initialStates.Hnefatafl.to_move();
		
		return game_state;
	},
	
	get_classes: function(type) {
		switch (type) {
			case 'W': return ['white'];
			case 'B': return ['black'];
			case 'K': return ['king'];
			case 'k': return ['king','throne'];
			case ',': return ['throne'];
			default: return ['empty'];
		};
	},
	
	fill_board: function(board) {
		var N = board.length;
		
		$("#board").empty();
		
		for (var i = 0; i < N; ++i) {
			var row = $('<div class="row"></div>');
			
			for (var j = 0; j < N; ++j) {
				var square_classes = this.get_classes(board[i][j]).join(' ');
				
				var square = $('<div id="square_'+i+'_'+j+'" class="square '+square_classes+'">&nbsp;</div>');
				square.data("square_i", i);
				square.data("square_j", j);
				square.data("type", board[i][j]);
				
				row.append(square);
			}
			$("#board").append(row);
		}
		
		$("#board").on("click", "div.square", this.square_clicked);
	},
	
	update_board: function(board) {
		var N = board.length;
		
		for (var i = 0; i < N; ++i) {
			for (var j = 0; j < N; ++j) {
				var square = $("#square_" + i + "_" + j);
				
				if (square.data("type") !== board[i][j]) { // something changed
					// Remove old classes
					$.each(this.get_classes(square.data("type")), function(x,cls) {
						square.removeClass(cls);
					});
					
					// Add new classes
					$.each(this.get_classes(board[i][j]), function(x,cls) {
						square.addClass(cls);
					});
					
					square.data("type", board[i][j]);
				}
			}
		}
	},
	
	fix_board_size: function() {
		function styleToPx(style) {
			return parseInt(style.substr(0, style.length-2));
		}
		
		var cont = $("#game_container");
		var width = cont[0].offsetWidth - styleToPx(cont.css("padding-left")) - styleToPx(cont.css("padding-right"));
		var height = cont[0].offsetHeight - styleToPx(cont.css("padding-top")) - styleToPx(cont.css("padding-bottom"));
		
		if (width > height) {
			$("#board").css('width', height + "px");
			$("#board").css('height', height + "px");
		} else {
			$("#board").css('height', width + "px");
			$("#board").css('width', width + "px");
		}
	},
	
	activate: function(i,j) {
		this.deactivate();
				
		this.active_field = $("#square_"+i+"_"+j);
		this.active_field.addClass("active");
	},
	
	deactivate: function() {
		if (this.active_field) {
			this.active_field.removeClass("active");
			
			this.active_field = null;
		}
	},
	
	square_clicked: function() {
		if (boardui.game_state === null) { return; }
		console.log('game_state');
		
		if (boardui.game_state.to_move !== boardui.my_color) {
			// not my turn
			console.log('not my turn');
			return;
		};
		
		var i = parseInt($(this).data("square_i"));
		var j = parseInt($(this).data("square_j"));
		
		//this.style.border = '2px solid green';
		
		if (boardui.moveFrom === null) {
			console.log('wee');
			
			console.log(boardui.game_state.to_move);
			if (Tafl.is_moving_color(boardui.game_state, [i, j])) {
				console.log("asd");
				
				// Check if there is a move possible from this location
				var legal_moves = Tafl.legal_moves(boardui.game_state);
				
				for (var k = 0; k < legal_moves.length; ++k) {
					if (legal_moves[k][0][0] === i && legal_moves[k][0][1] === j) {
						boardui.moveFrom = [i,j];
						boardui.activate(i, j);
						return;
					}
				}

				// If this is reached, no possible move from here
			}
			console.log("clock");
		} else {
			if (boardui.moveFrom[0] === i && boardui.moveFrom[1] === j) { // Deactivate active piece
				boardui.moveFrom = null;
				boardui.deactivate();
				return;
			}
			
			try {
				var move = [boardui.moveFrom, [i, j]];
				boardui.make_move(move);
				
				if (boardui.network_game === true) {
					TaflNet.send_move(move);
				}

				boardui.moveFrom = null;
				boardui.deactivate();
			} catch(e) {
				if (e === "IllegalMove") {
					boardui.moveFrom = null;
					boardui.deactivate();
					
					console.log("IllegalMove");
				} else if (e === "NotConnected") {
					boardui.moveFrom = null;
					boardui.deactivate();
				} else {
					throw e;
				}
			}
		}
	},
	
	make_move: function(move) {
		Tafl.make_move(boardui.game_state, move);
		
		this.update_board(boardui.game_state.board);
		
		if (Tafl.terminal_test(boardui.game_state) === true) {
			// Game ended
			var win_reason;
			
			switch(boardui.game_state.win_reason) {
				case 'NoKing': win_reason = 'The King was captured.'; break;
				case 'KingEscaped': win_reason = 'The King escaped.'; break;
				case 'NoLegalMoves': win_reason = 'There are no legal moves.'; break;
				default: win_reason = 'For a unknown reason';
			}
			
			var winner = (boardui.game_state.winner == 'W')?'White':'Black';
			
			boardui.alert(win_reason + "<br/>" + winner + " player wins.");
		} else {
			// Check if AI has to make the next move, and if so do it
			boardui.make_ai_move();
		}
	},
	
	make_ai_move: function() {
		if (boardui.is_ai[boardui.game_state.to_move] !== true) {
			return;
		}
		
		// Start new thread for this
		setTimeout(function() {
			var ai_move = TaflAI.get_best_move(boardui.game_state, 2);
		
			boardui.make_move(ai_move.move);
			boardui.activate(ai_move.move[1][0], ai_move.move[1][1]);
			
			boardui.notifiy(); // Notify user of the new ai move
		}, 0);
	},
	
	on_leave_board: function() {
		boardui.save_game();
	},
	
	alert: function(message) {
		$.ui.popup(message);
		
		this.notifiy();
	},
	
	notifiy: function() {
		if (! navigator || ! navigator.notification) { return; }
		
		if (uisettings.notification.vibrate) {
			navigator.notification.vibrate(uisettings.notification.vibrate_length);
		}
		
		if (uisettings.notification.beep) {
			navigator.notification.beep(uisettings.notification.beep_times);
		}
	},
	
	
	rate_current_state: function() {
		var score = TaflAI.rate_state(boardui.game_state);
		$("#score").text(score);
	},
};
var boardUiInitializeBoard = boardui.init;
var boardUiLeaveBoard = boardui.on_leave_board;


var game_starter = {
	load_game_list: function() {
		$.ui.setTitle("Androtafl");
		
		console.log("game list");
		
		var games = storage.get('open_games', []);
		
		$("#game_list").empty();
		for (var i = 0; i < games.length; ++i) {
			//if (options !== undefined) {
				$("#game_list").append('<li><a href="#game_panel" onclick="javascript:game_starter.load_game(\''+
												games[i].id+'\');">' + games[i].name + ' (turn ' + games[i].turn + ')</a></li>');
			//}
		}
	},
	
	load_game: function(game_id) {
		console.log("load game");
		
		var safegame = storage.get("safegame_" + game_id);
		
		if (safegame === null) {
			return;
		}
		
		boardui.load_game(safegame);
	},
	
	network_game: function() {
		TaflNet.connect();
		
		document.addEventListener("pause", killNet, false);
		document.addEventListener("offline", killNet, false);
		
		$.ui.setTitle("Network game");
		
		boardui.game_name = "Network game";
		boardui.network_game = true;
		
		$("#wait_for_game").css('display','block');
		$("#game_container").css('display','none');
	},
	
	game_vs_white_ai: function() {
		boardui.is_ai['W'] = true;
		boardui.is_ai['B'] = false;
		boardui.my_color = 'B';
		
		boardui.game_name = "You VS. CPU";
		
		boardui.load_state();

		$.ui.setTitle("You VS. CPU");
		boardui.make_ai_move();
	},
	
	game_vs_black_ai: function() {
		boardui.is_ai['W'] = false;
		boardui.is_ai['B'] = true;
		boardui.my_color = 'W';
		
		boardui.game_name = "CPU VS. You";

		boardui.load_state();

		$.ui.setTitle("CPU VS. You");
		boardui.make_ai_move();
	},
};
var gameStarterLoadGameList = game_starter.load_game_list; // To be accessed via data-load

TaflNet.on_game_start = function(data) {
	$("#wait_for_game").css('display','none');
	$("#game_container").css('display','block');

	boardui.my_color = data.your_color;
	
	boardui.game_id = data.game_id;
	boardui.load_state();
	
	var colorName = (data.your_color == 'W')?'White':'Black';
	
	boardui.alert("Game started. You're " + colorName);
};

TaflNet.on_move = function(move) {
	boardui.make_move(move);
	boardui.activate(move[1][0], move[1][1]);
	
	boardui.notifiy(); // Notify the user of the opponents move
};


// Hook up some events to kill the network if app closes
function killNet() {
	var s = TaflNet.socket;
	s.disconnect();
}


