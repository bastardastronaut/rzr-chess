import { useState, useEffect, useContext } from "react";
import { Chessboard } from "react-chessboard";
import { Move } from "./module/Chess";
import ChessContext from "./ChessContext";
import RzRChess from "./module/Chess";

export default function App() {
  const chess = useContext(ChessContext);
  const [position, setPosition] = useState<string>(chess.fen);

  function onDrop(from: string, to: string) {
    const result = chess.move({
      from,
      to,
      promotion: "q", // always promote to a queen for example simplicity
    });
    return result;
  }

  useEffect(() => {
    const onBoardChanged = (position: string) => setPosition(position);

    chess.addEventListener("boardChanged", onBoardChanged);
    return () => {
      chess.removeEventListener("boardChanged", onBoardChanged);
    };
  }, []);

  return <Chessboard position={position} onPieceDrop={onDrop} />;
}
