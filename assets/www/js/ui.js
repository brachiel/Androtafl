
//Test
//TaflUnitTest();

/* Initialize and prepare the game */
var tafl_game = new TaflState();
tafl_game.loadBoard(Tafl.initialStates.Hnefatafl.board());
tafl_game.to_move = Tafl.initialStates.Hnefatafl.to_move();

/* Create special boardui objects that handles ui related game functions */
var boardui = {
	moveFrom: null,
	my_color: 'W',
	activeField: null,
	active_field: null,
	
	max_width: null,
	max_height: null,
	
	is_ai: {'W': false, 'B': true },
		
	init: function() {
		this.max_width = document.getElementById('board').offsetWidth;
		this.max_height = document.getElementById('board').offsetHeight;
		
		return (this.max_width > 0 && this.max_height > 0);
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
		if (tafl_game.to_move !== boardui.my_color) {
			// not my turn
			return;
		};
		
		var i = parseInt($(this).data("square_i"));
		var j = parseInt($(this).data("square_j"));
		
		//this.style.border = '2px solid green';
		
		if (boardui.moveFrom === null) {
			if (Tafl.is_moving_color(tafl_game, [i, j])) {
				
				// Check if there is a move possible from this location
				var legal_moves = Tafl.legal_moves(tafl_game);
				
				for (var k = 0; k < legal_moves.length; ++k) {
					if (legal_moves[k][0][0] === i && legal_moves[k][0][1] === j) {
						boardui.moveFrom = [i,j];
						boardui.activate(i, j);
						return;
					}
				}

				// If this is reached, no possible move from here
			}
		} else {
			if (boardui.moveFrom[0] === i && boardui.moveFrom[1] === j) { // Deactivate active piece
				boardui.moveFrom = null;
				boardui.deactivate();
				return;
			}
			
			try {
				var move = [boardui.moveFrom, [i, j]];
				boardui.make_move(move);
				TaflNet.send_move(move);

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
		Tafl.make_move(tafl_game, move);
		
		this.update_board(tafl_game.board);
		
		if (Tafl.terminal_test(tafl_game) === true) {
			// Game ended
			var win_reason;
			
			switch(tafl_game.win_reason) {
				case 'NoKing': win_reason = 'The King was captured.'; break;
				case 'KingEscaped': win_reason = 'The King escaped.'; break;
				case 'NoLegalMoves': win_reason = 'There are no legal moves.'; break;
				default: win_reason = 'For a unknown reason';
			}
			
			var winner = (tafl_game.winner == 'W')?'White':'Black';
			
			boardui.alert(win_reason + "<br/>" + winner + " player wins.");
		} else {
			// Check if AI has to make the next move, and if so do it
			boardui.make_ai_move();
		}
	},
	
	make_ai_move: function() {
		console.log(boardui.is_ai[tafl_game.to_move]);
		if (boardui.is_ai[tafl_game.to_move] !== true) {
			return;
		}
		
		// Start new thread for this
		setTimeout(function() {
			var ai_move = TaflAI.get_best_move(tafl_game, 2);
		
			boardui.make_move(ai_move.move);
		}, 0);
	},
	
	alert: function(message) {
		$.ui.popup(message);
	},
	
	
	rate_current_state: function() {
		var score = TaflAI.rate_state(tafl_game);
		$("#score").text(score);
	},
};


$().ready(function(){
	// Fill board

	var waitForCss = setInterval(function(){
		if (boardui.init()) {
			// Game init successful
			clearInterval(waitForCss);

			boardui.fix_board_size();
			boardui.fill_board(tafl_game.board);
		}
	}, 50);

	window.onresize = function() {
		setTimeout(boardui.fix_board_size, 50);
	};

	/*
	window.onorientationchange = function() {
		console.log(window.orientation);
		
		switch (window.orientation) {
			case 90:
			case -90:
				boardui.fix_board_size();
				break;
			default:
				boardui.fix_board_size();
				break;
		}
	};
	*/
});


var game_starter = {
	network_game: function() {
		TaflNet.connect();
		
		document.addEventListener("pause", killNet, false);
		document.addEventListener("offline", killNet, false);
	},
	
	game_vs_white_ai: function() {
		boardui.is_ai['W'] = true;
		boardui.is_ai['B'] = false;
		boardui.my_color = 'B';
		
		boardui.make_ai_move();
	},
	
	game_vs_black_ai: function() {
		boardui.is_ai['W'] = false;
		boardui.is_ai['B'] = true;
		boardui.my_color = 'W';
		
		boardui.make_ai_move();
	},
};

TaflNet.on_game_start = function(data) {
	boardui.my_color = data.your_color;
	var colorName = (data.your_color == 'W')?'White':'Black';
	
	boardui.alert("Game started. You're " + colorName);
};

TaflNet.on_move = function(move) {
	boardui.make_move(move);
	boardui.activate(move[1][0], move[1][1]);
};


// Hook up some events to kill the network if app closes
function killNet() {
	var s = TaflNet.socket;
	s.disconnect();
}


