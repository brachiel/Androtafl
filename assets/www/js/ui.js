
jo.load();

//Test
//TaflUnitTest();
var uiScreen;

var tafl_game = new TaflState();
tafl_game.loadBoard(Tafl.initialStates.Hnefatafl.board());
tafl_game.to_move = Tafl.initialStates.Hnefatafl.to_move();

var N = tafl_game.board.length;
var uiBoard;

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

function drawBoard(table, board) {
	for (var i = 0; i < board.length; ++i) {
		for (var j = 0; j < board[i].length; ++j) {
			table.setCell
			
		}
	}
}

var uiBoardData = prepareBoard(tafl_game.board);
var uiBoard = new joTable(uiBoardData);

// Add jo function that is not implemented, yet
if (! uiBoard.setCell) {
	uiBoard.setCell = function(i,j) {
		uiBoard.setValue(i*N + j);
	}
}

// Build board widget and connect events

var moveFrom = null;
uiBoard.selectEvent.subscribe(function(index, table){
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
			makeMove([moveFrom, [i, j]]);

			moveFrom = null;
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
    new joTitle("Andotafl"),
    uiBoard
]);

var uiStack = new joStack();
var uiScreen = new joScreen(uiStack);

uiStack.push(uiCard);
