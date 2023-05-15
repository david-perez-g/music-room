exports.RoomLibrary = class RoomLibrary {
    constructor() {
        this.rooms = {};
    }

    addRoom(roomName) {
        this.rooms[roomName] = [];
    }

    deleteRoom(roomName) {
        this.rooms[roomName] = undefined;
    }

    getRoom(roomName) {
        return this.rooms[roomName];
    }

    getRoomSongs(roomName) {
        return this.getRoom(roomName);
    }

    addSongToRoom(roomName, song) {
        if (!this.rooms[roomName]) { 
            return this.rooms[roomName] = [song];
        }

        this.rooms[roomName].push(song);
    }
}