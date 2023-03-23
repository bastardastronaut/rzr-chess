import { RzRConnector, arrayify, hexlify, IntentStatus } from "rzr-connector";

import { Chess } from "chess.js";

export type Move = {
  from: string;
  to: string;
  promotion?: string;
};

export type AvailableContact = {
  identity: string;
  name: string;
};

const CONTACT_MANAGER_ADDRESS = "0xfdfa50bed1935234798fca3395c21deaec14f3be";

const GAME_INTENT = 192;
enum EventType {
  NEW_GAME = 1,
  SET_GAME_STATUS,
  MOVE,
  ACK,
}
// also add event type for game resync, basically text encode fen

const POSITION_MAP = new Map([
  ["a", 0],
  ["b", 1],
  ["c", 2],
  ["d", 3],
  ["e", 4],
  ["f", 5],
  ["g", 6],
  ["h", 7],
]);

const PROMOTION_MAP = new Map([
  ["q", 0],
  ["b", 1],
  ["r", 2],
  ["n", 3],
]);

const boxToHex = (position: string): string => {
  const xNum = POSITION_MAP.get(position[0]) as number;
  const yNum = parseInt(position[1]) - 1;

  const num = (xNum << 5) + (yNum << 2);

  return num < 16 ? `0x0${num.toString(16)}` : `0x${num.toString(16)}`;
};

const hexToBox = (hexPosition: string) => {
  const num = parseInt(hexPosition);

  const y = 1 + ((num >> 2) & 0b111);
  const x = String.fromCharCode((num >> 5) + 97);

  return `${x}${y}`;
};

const ec = new TextEncoder();
const dc = new TextDecoder();

export default class RzRChess extends RzRConnector<{
  boardChanged: string;
  availableContactsChanged: AvailableContact[];
  playingStatusChanged: boolean;
}> {
  private game: Chess | null = null;
  private opponent: string | null = null;

  constructor() {
    super();
  }

  protected onMessage(eventType: string | number, eventData: any) {
    switch (eventType) {
      case "newPeerConnection":
        return this.onNewPeerConnection(eventData.identity, eventData.intents);
      case "peerDisconnected":
        return this.onPeerDisconnect(eventData);
      case `${CONTACT_MANAGER_ADDRESS}-contactsChanged`:
        return this.emit(
          "availableContactsChanged",
          eventData.filter(
            (c: AvailableContact & { isAvailable: boolean }) => c.isAvailable
          )
        );
      case EventType.MOVE:
        return this.handleMove(eventData.from, eventData.message);
      case EventType.NEW_GAME:
        return this.handleNewGame(eventData.from);
      case EventType.ACK:
        return this.handleAck(eventData.from, eventData.message);
    }
  }

  private onPeerDisconnect(identity: string) {
    if (identity === this.opponent) {
      this.reset()
    }
  }

  reset() {
    this.game = null
    if (this.opponent) {
      this.updateIntent(this.opponent, GAME_INTENT, IntentStatus.COMPLETED)
      this.opponent = null;
    }
    this.emit("playingStatusChanged", this.isPlaying);
  }

  private startGame() {
    this.game = new Chess();
    this.emit("playingStatusChanged", this.isPlaying);
  }

  private handleAck(from: string, message: string) {
    if (from !== this.opponent) return;

    // TODO: this should be undefined
    if (!this.game) {
      this.startGame();
      return;
    }

    const fen = dc.decode(arrayify(message));

    if (fen !== this.game.fen()) {
      this.game.undo();
      this.emit("boardChanged", this.game.fen());
    }
  }

  private handleNewGame(from: string) {
    if (!this.opponent) {
      this.opponent = from;
    } else if (from !== this.opponent) {
      return;
    }

    this.startGame();

    this.updateIntent(from, GAME_INTENT, IntentStatus.IN_PROGRESS);

    this.sendTo(from, EventType.ACK);
  }

  // actually, send over the entire fen with each move
  private handleMove(from: string, message: string) {
    if (!this.game || from !== this.opponent) return;
    const move = {
      from: hexToBox(message.slice(0, 4)),
      to: hexToBox(`0x${message.slice(4, 6)}`),
    };
    try {
      this.game.move(move);
      this.emit("boardChanged", this.game.fen());
      this.sendTo(from, EventType.ACK, hexlify(ec.encode(this.game.fen())));
    } catch (e) {}
  }

  initiateGame(identity: string) {
    this.contactPeer(identity, GAME_INTENT)
      .then(() => {
        this.sendTo(identity, EventType.NEW_GAME);
        this.opponent = identity;
      })
      .catch(() => {}); // opponent not found
  }

  onNewPeerConnection(identity: string, intents: number[]) {
    if (this.isPlaying || !intents.includes(GAME_INTENT)) return;

    this.opponent = identity;
  }

  get isPlaying() {
    return this.game !== null;
  }

  get fen() {
    if (!this.game) throw new Error("not playing");
    return this.game.fen();
  }

  move(move: Move): boolean {
    if (!this.game || !this.opponent) return false;

    try {
      this.game.move(move);

      this.sendTo(
        this.opponent,
        EventType.MOVE,
        `${boxToHex(move.from)}${boxToHex(move.to).slice(2)}`
      );

      this.emit("boardChanged", this.game.fen());

      return true;
    } catch {}
    return false;
  }
}
