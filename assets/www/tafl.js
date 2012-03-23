/*
 * This is the JS Tafl Game lib and part of Androtafl.
 */

(function () {
	'use strict';
	
	Array.prototype.has = function(obj) {
	    var i = this.length;
	    while (i--) {
	        if (this[i] === obj) {
	            return true;
	        }
	    }
	    return false;
	};
	
	function TaflState() {
		this.board = [''];
		this.N = 0;
		this.to_move = 'w';
		this.legal_moves_cache = null;
		this.winner = null;
		
		this.loadBoard = function(board) {
			this.board = board;
			this.N = board.length;
			if (board[0].length !== this.N) throw "BoardNotSquare";
		};
		
		this.clone = function() {
			var i, t = new TaflState();
						
			for (i = 0; i < this.N; ++i) {
				t.board[i] = this.board[i];
			}
			
			t.N = this.N;
			t.to_move = this.to_move;
			t.legal_moves_cache = this.legal_moves_cache;
			t.winner = this.winner;
		}
	}
	
	var Tafl = {
		legal_moves: function(s) {
			if (s.legal_moves_cache) return s.legal_moves_cache;
			
			var i,j,k, N=s.N, moves=[], legal_fields;
			
			
			for (i=0; i<N; ++i) {
				for (j=0; j<N; ++j) {
					if (! this.is_moving_color(s, [i,j])) continue;
					
					legal_fields = ['.'];
					if (s.board[i][j] === 'K') legal_fields.push(','); // Only king can step on throne
					
					for (k=i+1; k<N; ++k) {
						if (legal_fields.has(s.board[k][j])) {
							moves.push([ [i,j], [k,j] ]);
						} else break;
					}
					
					for (k=1; k<i+1; ++k) {
						if (legal_fields.has(s.board[i-k][j])) {
							moves.push([ [i,j], [i-k,j] ]);
						} else break;
					}
					
					for (k=j+1; k<N; ++k) {
						if (legal_fields.has(s.board[i][k])) {
							moves.push([ [i,j], [i,k] ]);
						} else break;
					}
					
					for (k=1; k<j+1; ++k) {
						if (legal_fields.has(s.board[i][j-k])) {
							moves.push([ [i,j], [i,j-k] ]);
						} else break;
					}
				}
			}
			
			s.legal_moves_cache = moves;
			return moves;
		},
		
		make_move: function(s, move) {
			if (! ( this.legal_moves(s).has(move) )) throw "IllegalMove";
			
			var i=move[0][0],j=move[0][1],k=move[1][0],l=move[1][1],c, empty='.', t;
			
			
			if (s.board[k][l] === 'k') empty = ','; // King was on throne
			
			s.board[k][l] = s.board[i][j];
			s.board[i][j] = empty;
			
			c = this.get_catches(s, [k,l]);
			for ( t=0; t < c.length; ++t ) {
				s[c[t][0]][c[t][1]] = '.';
			}
			
			if (s.to_move === 'W') s.to_move = 'B';
			else				   s.to_move = 'W';
			
			s.legal_moves_cache = null;
		},
	
		get_catches: function(s, last_move) {
			var catches = [], k=last_move[0], l=last_move[1], directions, 
			    d, di, dj, king_pos, i,j, king_capturers;
			
			directions = [[1,0],[-1,0],[0,1],[0,-1]];
			
			for (d=0; d < directions.length; ++d) {
				di = directions[d][0]; dj = directions[d][1];
				
				if (!this.is_moving_color(s, [k+di, j+dj]) &&
					 this.is_moving_color(s, [k+2*di, j+2*dj]) &&
					 s.board[k][l].toUpperCase() !== 'K') {
					catches.push([k+di, l+dj]);
				}
			}
			
			// Check if king is captured separately
			king_pos = this.find_king(s);
			i = king_pos[0]; j=king_pos[1];
			
			king_capturers = ['W',',']; // Kings can be captured by white stones
										// or the throne
			if (i > 0 && j > 0 && i < s.N-1 && j < s.N-1) { // King is in not on
															// an edge
				if (king_capturers.has(s.board[i][j-1]) && king_capturers.has(s.board[i][j+1]) &&
					king_capturers.has(s.board[i-1][j]) && king_capturers.has(s.board[i+1][j])) {
					catches.push([i,j]);
				}
			}
				
			
			return catches;
		},
		
		is_moving_color: function(s, move) {
			var i=move[0], j=move[1];
			
			if (s.to_move === s.board[i][j]) return true;
			// K and k are both kings
			if (s.to_move === 'B' && s.board[i][j].toUpperCase() === 'K') return true;	
			
			return false;
		},
		
		find_king: function(s) {
			for (i=0; i<s.N; ++i){
				j = s.board[i].find('K'); // Kind is in the field?
				if (! j > 0) s.board[i].find('k'); // King is on throne?
				if (j >= 0)  return [i,j];
			}
			
			return null;
		}
		
		terminal_test: function(s) {
			var i, j, king_found = false, corners;
			
			// find position of king and check if he's on an edge
			for (i=0; i<s.N; ++i){
				j = s.board[i].find('K'); // Kind is in the field?
				if (! j > 0) s.board[i].find('k'); // King is on throne?
				
				if (j >= 0) { // Found king
					
					// King is at an edge
					if (i === 0 || i === s.N-1 || j === 0 || j === s.N-1) {
						s.winner = 'B';
						return true;
					}
					
					kind_found = true;
					break;
				}
			}
			
			if (! king_found) {
				s.winner = 'W';
				return true; // King was captured
			}
			
			// Are there any legal moves? If not, player loses
			if (this.legal_moves(s).length == 0) {
				if (s.to_move === 'W') s.winner = 'B';
				else				   s.winner = 'W';
				return true;
			}
			
			return false; // no one won, yet
		}
	};
})();
