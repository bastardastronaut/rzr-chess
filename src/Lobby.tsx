import { useState, useContext, useEffect } from "react";
import ChessContext from "./ChessContext";
import { AvailableContact } from "./module/Chess";

const Lobby = () => {
  const chess = useContext(ChessContext);
  const [contacts, setContacts] = useState<AvailableContact[]>([]);

  useEffect(() => {
    const onContactsChanged = (contacts: AvailableContact[]) =>
      setContacts(contacts);

    chess.addEventListener("availableContactsChanged", onContactsChanged);
    return () => {
      chess.removeEventListener("availableContactsChanged", onContactsChanged);
    };
  }, []);

  return (
    <ul>
      {contacts.map((c) => (
        <li key={c.identity}>
          {c.name} <button onClick={() => chess.initiateGame(c.identity)}>connect</button>
        </li>
      ))}
    </ul>
  );
};

export default Lobby;
