import "./App.css";
import { useState, useEffect } from "react";
import RzRChess, { Move } from "./module/Chess";
import Lobby from './Lobby'
import ChessInterface from './ChessInterface'
import ChessContext from "./ChessContext";

export default function App() {
  const [chess, setGame] = useState(new RzRChess());
  const [isPlaying, setIsPlaying] = useState(chess.isPlaying)

  useEffect(() => {
    chess.addEventListener('playingStatusChanged', setIsPlaying);

    return () => {
      chess.removeEventListener('playingStatusChanged', setIsPlaying);
    }
  }, [])

  return (
    <div
      style={{
        margin: "3rem auto",
        maxWidth: "70vh",
        width: "70vw",
      }}
    >
      <ChessContext.Provider value={chess}>
        {isPlaying ? <ChessInterface /> : <Lobby />} 
      </ChessContext.Provider>
    </div>
  );
}
