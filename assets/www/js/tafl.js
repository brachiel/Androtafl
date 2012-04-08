/*
 * This is the JS Tafl Game lib and part of Androtafl.
 */

Array.prototype.has = function(obj) {
	var i = this.length;
	while (i--) {
		if (this[i] === obj) { return true; }
	}
	return false;
};

String.prototype.setCharAt = function(index, chr) {
	if (index > this.length - 1) return this;
	return this.substr(0, index) + chr + this.substr(index + 1);
}

function TaflState() {
	'use strict';

	this.board = [ '' ];
	this.N = 0;
	this.to_move = 'w';
	this.legal_moves_cache = null;
	this.winner = null;
	this.win_reason = null;
	
	this.move_history = [];

	// AI related variables
	this.initial_W = null;
	this.initial_B = null;
}
TaflState.prototype.loadBoard = function(board) {
	var i, j, pieces;

	this.board = board;
	this.N = board.length;

	if (board[0].length !== this.N) throw "BoardNotSquare";

	pieces = Tafl.count_pieces(board);
	this.initial_W = pieces.W;
	this.initial_B = pieces.B;
};
TaflState.prototype.clone = function() {
	var i, t = new TaflState();

	for (i = 0; i < this.N; ++i) {
		t.board[i] = this.board[i];
	}

	t.N = this.N;
	t.to_move = this.to_move;
	t.legal_moves_cache = this.legal_moves_cache;
	t.winner = this.winner;
	t.win_reason = this.win_reason;

	t.initial_W = this.initial_W;
	t.initial_B = this.initial_B;
	
	t.move_history = [];
	for (i = 0; i < this.move_history.length; ++i) {
		var move = this.move_history[i];
		
		t.move_history.push([ [ move[0][0], move[0][1] ], [ move[1][0], move[1][1] ] ]);
	}

	return t;
};

var Tafl = {
	legal_moves : function(s) {
		if (s.legal_moves_cache) return s.legal_moves_cache;

		var i, j, k, N = s.N, moves = [], legal_fields;

		for (i = 0; i < N; ++i) {
			for (j = 0; j < N; ++j) {
				if (!this.is_moving_color(s, [ i, j ])) continue;

				legal_fields = [ '.' ];
				if (s.board[i][j] === 'K') legal_fields.push(','); // Only king
				// can step
				// on throne

				for (k = i + 1; k < N; ++k) {
					if (legal_fields.has(s.board[k][j])) {
						moves.push([ [ i, j ], [ k, j ] ]);
					} else {
						if (s.board[k][j] !== ',') {
							break;
						}
					}
				}

				for (k = 1; k < i + 1; ++k) {
					if (legal_fields.has(s.board[i - k][j])) {
						moves.push([ [ i, j ], [ i - k, j ] ]);
					} else {
						if (s.board[i - k][j] !== ',') {
							break;
						}
					}
				}

				for (k = j + 1; k < N; ++k) {
					if (legal_fields.has(s.board[i][k])) {
						moves.push([ [ i, j ], [ i, k ] ]);
					} else {
						if (s.board[i][k] !== ',') {
							break;
						}
					}
				}

				for (k = 1; k < j + 1; ++k) {
					if (legal_fields.has(s.board[i][j - k])) {
						moves.push([ [ i, j ], [ i, j - k ] ]);
					} else {
						if (s.board[i][j - k] !== ',') {
							break;
						}
					}
				}
			}
		}

		s.legal_moves_cache = moves;
		return moves;
	},

	make_move : function(s, move) {
		function replaceCharAt(string, index) {
		}

		if (!this.movelist_has_move(this.legal_moves(s), move))
			throw "IllegalMove";

		var i = move[0][0], j = move[0][1], k = move[1][0], l = move[1][1], c, piece, empty = '.', t;

		piece = s.board[i][j];

		if (piece === 'k') empty = ','; // King was on throne
		if (piece === 'k' && s.board[k][l] === '.') piece = 'K'; // King
		// steps off
		// the
		// throne

		s.board[k] = s.board[k].setCharAt(l, piece);
		s.board[i] = s.board[i].setCharAt(j, empty);

		c = this.get_captures(s, [ k, l ]);
		for (t = 0; t < c.length; ++t) {
			s.board[c[t][0]] = s.board[c[t][0]].setCharAt(c[t][1], '.');
		}

		if (s.to_move === 'W')
			s.to_move = 'B';
		else
			s.to_move = 'W';

		s.move_history.push(move);
		
		s.legal_moves_cache = null;
	},

	get_captures : function(s, last_move) {
		var captures = [], k = last_move[0], l = last_move[1], directions, d, di, dj, king_pos, i, j, king_capturers;

		directions = [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ] ];

		for (d = 0; d < directions.length; ++d) {
			di = directions[d][0];
			dj = directions[d][1];

			if (k + 2 * di < 0 || k + 2 * di >= s.N || l + 2 * dj < 0
					|| l + 2 * dj >= s.N) continue;

			if (this.is_not_moving_color(s, [ k + di, l + dj ])
					&& this.is_moving_color(s, [ k + 2 * di, l + 2 * dj ])
					&& s.board[k + di][l + dj].toUpperCase() !== 'K') {
				captures.push([ k + di, l + dj ]);
			}
		}

		// Check if king is captured separately
		king_pos = this.find_king(s);
		i = king_pos[0];
		j = king_pos[1];

		king_capturers = [ 'W', ',' ]; // Kings can be captured by white stones
		// or the throne
		if (i > 0 && j > 0 && i < s.N - 1 && j < s.N - 1) { // King is in not on
			// an edge
			if (king_capturers.has(s.board[i][j - 1])
					&& king_capturers.has(s.board[i][j + 1])
					&& king_capturers.has(s.board[i - 1][j])
					&& king_capturers.has(s.board[i + 1][j])) {
				captures.push([ i, j ]);
			}
		}

		return captures;
	},

	is_moving_color : function(s, pos) {
		var i = pos[0], j = pos[1];

		if (s.to_move === s.board[i][j]) return true;
		// K and k are both kings
		if (s.to_move === 'B' && s.board[i][j].toUpperCase() === 'K')
			return true;

		return false;
	},

	is_not_moving_color : function(s, pos) { // Returns true if it's a piece,
		// but not of the current color
		if (this.is_moving_color(s, pos)
				|| [ '.', ',' ].has(s.board[pos[0]][pos[1]])) {
			return false;
		} else {
			return true;
		}
	},

	find_king : function(s) {
		var i, j;

		for (i = 0; i < s.N; ++i) {
			j = s.board[i].toUpperCase().indexOf('K'); // Kind is in the field?
			if (j >= 0) return [ i, j ];
		}

		return null;
	},

	terminal_test : function(s) {
		var i, j, king_found = false, corners;

		// find position of king and check if he's on an edge
		for (i = 0; i < s.N; ++i) {
			j = s.board[i].toUpperCase().indexOf('K'); // King is in the field?

			if (j >= 0) { // Found king

				// King is at an edge
				if (i === 0 || i === s.N - 1 || j === 0 || j === s.N - 1) {
					s.winner = 'B';
					s.win_reason = 'KingEscaped';
					return true;
				}

				king_found = true;
				break;
			}
		}

		if (king_found === false) {
			s.winner = 'W';
			s.win_reason = 'NoKing';
			return true; // King was captured
		}

		// Are there any legal moves? If not, player loses
		if (this.legal_moves(s).length == 0) {
			if (s.to_move === 'W')
				s.winner = 'B';
			else
				s.winner = 'W';
			s.win_reason = 'NoLegalMoves';
			return true;
		}

		return false; // no one won, yet
	},

	movelist_has_move : function(movelist, move) {
		var i;
		for (i = 0; i < movelist.length; ++i) {
			if (movelist[i][0][0] === move[0][0]
					&& movelist[i][0][1] === move[0][1]
					&& movelist[i][1][0] === move[1][0]
					&& movelist[i][1][1] === move[1][1]) return true;
		}
		return false;
	},

	count_pieces : function(board) {
		var i, j, whites = 0, blacks = 0;

		for (i = 0; i < board.length; ++i) {
			for (j = 0; j < board.length; ++j) {
				switch (board[i][j]) {
					case 'W':
						++whites;
						break;

					case 'B':
					case 'k':
					case 'K':
						++blacks;
						break;
				}
			}
		}

		return {
			W : whites,
			B : blacks
		};
	},

	initialStates : {
		Hnefatafl : {
			board : function() {
				return [ "...WWWWW...", // W = attacker
				         ".....W.....", // B = defender
				         "...........", // k = king on throne
				         "W....B....W", 
				         "W...BBB...W", 
				         "WW.BBkBB.WW", 
				         "W...BBB...W",
						 "W....B....W", 
						 "...........", 
						 ".....W.....",
						 "...WWWWW..." ]
			},
			to_move : function() {
				return "W"
			},
		}
	}
};

var TaflUnitTest = function() {
	function test(name, a, b) {
		if (a !== b)
			console.log("Unit test '" + name + "' failed: '" + a + "' !== '"
					+ b + "'");
		// else console.log("Unit test " + name + " passed");
	}

	var state = new TaflState();
	state.loadBoard(Tafl.initialStates.Hnefatafl.board());
	state.to_move = Tafl.initialStates.Hnefatafl.to_move();

	test("is_moving_color 1", true, Tafl.is_moving_color(state, [ 0, 4 ])); // W
	test("is_moving_color 2", false, Tafl.is_moving_color(state, [ 1, 4 ])); // .
	test("is_moving_color 3", false, Tafl.is_moving_color(state, [ 4, 5 ])); // B
	test("is_moving_color 4", false, Tafl.is_moving_color(state, [ 5, 5 ])); // k

	test("is_not_moving_color 1", false, Tafl.is_not_moving_color(state,
			[ 0, 0 ])); // W
	test("is_not_moving_color 2", false, Tafl.is_not_moving_color(state,
			[ 1, 4 ])); // .
	test("is_not_moving_color 3", true, Tafl.is_not_moving_color(state,
			[ 4, 5 ])); // B
	test("is_not_moving_color 4", true, Tafl.is_not_moving_color(state,
			[ 4, 5 ])); // k

	test("loadBoard", state.board[3], "W....B....W");

	Tafl.make_move(state, [ [ 10, 7 ], [ 10, 9 ] ]);

	test("make_move white", state.board[10], "...WWWW..W.");

	Tafl.make_move(state, [ [ 5, 7 ], [ 10, 7 ] ]);

	test("make_move black 1", state.board[5], "WW.BBkB..WW");
	test("make_move black 2", state.board[10], "...WWWWB.W.");

	Tafl.make_move(state, [ [ 10, 9 ], [ 10, 8 ] ]);

	test("capture", state.board[10], "...WWWW.W..");
};

var TaflAI = {
	// 1 = current player wins, -1 = other player wins
	rate_state : function(original_state) {
		// We'll change the state, so don't alternate the one given
		var state = original_state.clone();

		// Prefactor 1 for white, -1 for black
		var p = (state.to_move === 'W') ? 1 : -1;
		
		if (Tafl.terminal_test(state) === true) {
			if (state.winner === 'W') return p;
			if (state.winner === 'B') return -p;
		}

		// Rating weights
		var w = {
			captures : 0.4,
			freedom : 0.3
		};

		var rating = 0;
		// Rate amount of pieces left

		var pieces = Tafl.count_pieces(state.board);

		rating -= p * w.captures * (1 - pieces.W / state.initial_W); // every lost W is good for black

		rating += p * w.captures * (1 - pieces.B / state.initial_B); // every lost B is good for white


		var p_moves = Tafl.legal_moves(state).length;

		state.to_move = (state.to_move === 'W') ? 'B' : 'W';
		state.legal_moves_cache = null;

		var np_moves = Tafl.legal_moves(state).length;

		rating += w.freedom * (p_moves - np_moves) / (p_moves + np_moves);

		return rating;
	},

	minimax: function(state, depth) {
		var rating = this.rate_state(state);
		if ((rating == 1 || rating == -1) || depth <= 0) { return rating; }

		var a = -10;
		
		var legal_moves = Tafl.legal_moves(state);
		for (var i = 0; i < legal_moves.length; ++i) {
			var new_state = state.clone();

			Tafl.make_move(new_state, legal_moves[i]);

			a = Math.max(a, -this.minimax(new_state, depth - 1));
		}

		return a;
	},
	
	get_best_move: function(state, depth) {
		var a = -10;
		
		var legal_moves = Tafl.legal_moves(state);
		var best_move;
		
		for (var i = 0; i < legal_moves.length; ++i) {
			var new_state = state.clone();

			Tafl.make_move(new_state, legal_moves[i]);

			var b = -this.minimax(new_state, depth - 1);
			if (b > a) {
				console.log("Found a move with rating " + b + " that is better than " + a);
				best_move = legal_moves[i];
				a = b;
			}
		}

		return {alpha: a, move: best_move};
	},
};

var exports = {};
exports.tafl = Tafl;
exports.taflstate = TaflState;
exports.taflai = TaflAI;
exports.taflunittest = TaflUnitTest;
