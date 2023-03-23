import { createContext } from "react";
import RzRChess from "./module/Chess";

const ChessContext = createContext<RzRChess>(null as any);

export default ChessContext;
