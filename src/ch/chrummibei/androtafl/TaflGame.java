package ch.chrummibei.androtafl;

public abstract class TaflGame {
	public abstract Move[] legal_moves();
	public abstract boolean make_move(Move m);
}
