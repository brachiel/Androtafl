
jo.load();

//Test
//TaflUnitTest();
var uiScreen;

var tafl_game = new TaflState();
tafl_game.loadBoard(Tafl.initialStates.Hnefatafl.board());
tafl_game.to_move = Tafl.initialStates.Hnefatafl.to_move();

var N = tafl_game.board.length;
var uiBoard;
var myColor;

function prepareBoard(board) {
	var ret_board = [];
	for (var i=0; i<board.length; ++i) {
		ret_board.push(board[i].split(''));
	}
	return ret_board;
}

function updateBoard(board) {
	var N = board.length;
	
	for (var i=0; i<board.length; ++i) {
		for (var j=0; j<board[i].length; ++j) {
			uiBoard.data[i][j] = board[i][j];
		}
	}
}

/* Subclass of joTable */
joTaflBoard = function(data) {
	joTable.apply(this, arguments);
};
joTaflBoard.extend(joTable, {
	tagName: "jotaflboard",
	
	// default row formatter
	formatItem: function(row, index) {
		var tr = document.createElement("tr");
		
		for (var i = 0, l = row.length; i < l; i++) {
			var o = document.createElement("td");
			//o.innerHTML = row[i];
			o.innerHTML = "&nbsp;";
			
			// this is a little brittle, but plays nicely with joList's select event
			o.setAttribute("index", index * l + i);
			o.setAttribute("type", row[i]);
			var classes;
			switch (row[i]) {
				case "k": classes="K throne"; break;
				case ",": classes="throne"; break;
				case ".": classes="empty"; break;
				default: classes=row[i];
			}
			o.setAttribute("class", classes);
			
			tr.appendChild(o);
		}
		
		return tr;
	},

	setCell: function(i, j) {
		this.setValue(i*this.data.length + j);
	}
	
});

var uiBoardData = prepareBoard(tafl_game.board);
var uiBoard = new joTaflBoard(uiBoardData);

// Build board widget and connect events

var moveFrom = null;
uiBoard.selectEvent.subscribe(function(index, table){
	if (tafl_game.to_move !== myColor) {
		// not my turn
		table.deselect();
		return; 
	};
	
	var i = table.getRow();
	var j = table.getCol();
	
	if (moveFrom === null) {
		if (Tafl.is_moving_color(tafl_game, [i, j])) {
			
			// Check if there is a move possible from this location
			var legal_moves = Tafl.legal_moves(tafl_game);
			for (var k = 0; k < legal_moves.length; ++k) {
				if (legal_moves[k][0][0] === i && legal_moves[k][0][1] === j) {
					moveFrom = [i,j];
					return;
				}
			}

			// If this is reached, no possible move from here
		}
		
		table.deselect();
	} else {
		if (moveFrom[0] === i && moveFrom[1] === j) { // Deactivate active piece
			moveFrom = null;
			return;
		}
		
		try {
			var move = [moveFrom, [i, j]];
			makeMove(move);
			TaflNet.send_move(move);

			moveFrom = null;
			table.deselect();
		} catch(e) {
			if (e === "IllegalMove") {
				table.deselect();
				moveFrom = null;
				
				joLog("IllegalMove");
			} else {
				throw e;
			}
		}
	}
		
});

function makeMove(move) {
	Tafl.make_move(tafl_game, move);
	
	updateBoard(tafl_game.board);
	uiBoard.refresh();
	
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
		
		uiScreen.alert(win_reason + "<br/>" + winner + " player wins.");
	}
}


// Build page
var uiCard = new joCard([
    new joTitle("Androtafl"),
    uiBoard
]);

var uiStack = new joStack();
var uiScreen = new joScreen(uiStack);

uiStack.push(uiCard);

// Connect Network

TaflNet.connect();

TaflNet.on_game_start = function(data) {
	myColor = data.your_color;
	var colorName = (myColor == 'W')?'White':'Black';
	
	uiScreen.alert("Game started. You're " + colorName);
};

TaflNet.on_move = function(move) {
	makeMove(move);
};
