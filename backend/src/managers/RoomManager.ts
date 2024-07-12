import { User } from "./UserManager";

let GLOBAL_ROOM_ID = 1;

export interface Room {
  user1: User;
  user2: User;
}

export class RoomManager {
  private rooms: Map<string, Room>;
  constructor() {
    this.rooms = new Map<string, Room>();
  }

  createRoom(user1: User, user2: User) {
    const roomId = this.generateId();
    this.rooms.set(roomId.toString(), {
      user1,
      user2,
    });
    user1.socket.emit("send-offer", { roomId });
    user2.socket.emit("send-offer", { roomId });
  }

  onOffer(roomId: string, sdp: string, socketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const receivingUser =
      room.user1.socket.id === socketId ? room.user2 : room.user1;
    receivingUser.socket.emit("offer", { roomId, sdp });
  }

  onAnswer(roomId: string, sdp: string, socketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const receivingUser =
      room.user1.socket.id === socketId ? room.user2 : room.user1;
    receivingUser.socket.emit("answer", { roomId, sdp });
  }

  generateId() {
    return GLOBAL_ROOM_ID++;
  }
}
