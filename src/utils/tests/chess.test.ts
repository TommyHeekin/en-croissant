import { expect, test } from "vitest";
import { ANNOTATION_INFO, type Annotation, NAG_INFO } from "../annotation";
import { parseSquare, parseUci } from "chessops";
import { getGameStats, getMoveDestination, hasMorePriority, headersToPGN } from "../chess";
import { createNode, defaultTree } from "../treeReducer";

test("NAGs are consistent", () => {
    for (const k of Object.keys(ANNOTATION_INFO)) {
        if (k === "") continue;
        const nag = ANNOTATION_INFO[k as Annotation].nag!;
        expect(NAG_INFO.get(`$${nag}`)).toBe(k);
    }
});

test("priority comparison", () => {
    expect(hasMorePriority([0, 0], [0])).toBe(false);
    expect(hasMorePriority([0], [0, 0])).toBe(true);
    expect(hasMorePriority([0], [1])).toBe(true);
    expect(hasMorePriority([1], [0])).toBe(false);
    expect(hasMorePriority([0, 0], [0, 1])).toBe(true);
    expect(hasMorePriority([0, 1], [0, 0])).toBe(false);
    expect(hasMorePriority([0, 1], [0, 2])).toBe(true);
    expect(hasMorePriority([0, 2], [0, 1])).toBe(false);
});

test("PGN headers preserve UTC time", () => {
    const pgn = headersToPGN({
        id: 1,
        fen: "",
        event: "Live Chess",
        site: "https://www.chess.com/game/live/1",
        date: "2026.09.19",
        time: "12:34:56",
        round: "-",
        white: "White",
        black: "Black",
        result: "1-0",
    });

    expect(pgn).toContain('[UTCTime "12:34:56"]');
});

test("castling destination ignores a check or mate suffix", () => {
    const white = (san: string) =>
        getMoveDestination({ san, halfMoves: 1, move: { from: 4, to: 0 } });
    const black = (san: string) =>
        getMoveDestination({ san, halfMoves: 2, move: { from: 60, to: 63 } });
    expect(white("O-O-O")).toBe(parseSquare("c1"));
    expect(white("O-O-O+")).toBe(parseSquare("c1"));
    expect(white("O-O-O#")).toBe(parseSquare("c1"));
    expect(black("O-O")).toBe(parseSquare("g8"));
    expect(black("O-O+")).toBe(parseSquare("g8"));
    expect(getMoveDestination({ san: "Nf3+", halfMoves: 1, move: { from: 6, to: 21 } })).toBe(21);
});

test("game stats count best moves for each side, including moves with annotations", () => {
    const tree = defaultTree();
    const whiteMove = createNode({
        fen: tree.root.fen,
        move: parseUci("e2e4")!,
        san: "e4",
        halfMoves: 1,
    });
    whiteMove.isBestMove = true;
    whiteMove.annotations = ["!"];
    const blackMove = createNode({
        fen: tree.root.fen,
        move: parseUci("e7e5")!,
        san: "e5",
        halfMoves: 2,
    });
    blackMove.isBestMove = true;
    whiteMove.children.push(blackMove);
    tree.root.children.push(whiteMove);

    const stats = getGameStats(tree.root);

    expect(stats.whiteBestMoves).toBe(1);
    expect(stats.blackBestMoves).toBe(1);
});
