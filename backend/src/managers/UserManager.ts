import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";

export interface User {
  name: string;
  socket: Socket;
}

export class UserManager {
  private users: User[];
  private queue: string[];
  private roomManager: RoomManager;

  constructor() {
    this.users = [];
    this.queue = [];
    this.roomManager = new RoomManager();
  }

  addUser(name: string, socket: Socket) {
    this.users.push({ name, socket });
    this.queue.push(socket.id);
    socket.emit("lobby");
    this.matchUsers();
    this.initHandlers(socket);
  }

  removeUser(socketId: string) {
    this.users = this.users.filter((x) => x.socket.id !== socketId);
    this.queue = this.queue.filter((x) => x == socketId);
  }

  matchUsers() {
    if (this.queue.length < 2) return;
    const sId1 = this.queue.pop();
    const user1 = this.users.find((x) => x.socket.id === sId1);
    const sId2 = this.queue.pop();
    const user2 = this.users.find((x) => x.socket.id === sId2);
    if (!user1 || !user2) return;
    console.log({ user1, user2 });
    const room = this.roomManager.createRoom(user1, user2);
    this.matchUsers();
  }

  initHandlers(socket: Socket) {
    socket.on("offer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
      this.roomManager.onOffer(roomId, sdp, socket.id);
    });
    socket.on("answer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
      this.roomManager.onAnswer(roomId, sdp, socket.id);
    });
    socket.on(
      "add-ice-candidate",
      ({
        candidate,
        type,
        roomId,
      }: {
        candidate: string;
        type: "sender" | "receiver";
        roomId: string;
      }) => {
        this.roomManager.onIceCandidate(roomId, socket.id, candidate, type);
      }
    );
  }
}
