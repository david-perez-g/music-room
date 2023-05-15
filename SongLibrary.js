const path = require("path");
const fs = require("fs/promises");

exports.SongLibrary = class SongLibrary {
    static songId = 0;

    constructor() {
        this.songs = {};
    }

    extractMetadata(songSrc) {
        return {};
    }

    async saveSongToLocalStorage(songSrc, id) {
        const p = path.join(__dirname, "music", `${id}`);        
        fs.writeFile(p, songSrc, "utf8");
    }

    async deleteSongFromLocalStorage(songId) {
        const p = path.join(__dirname, "music", `${songId}`);       
        fs.rm(p);
    }

    async readSongSrc(songId) {
        const p = path.join(__dirname, "music", `${songId}`);
        return fs.readFile(p, "utf8");
    }

    // Saves the song to the local storage and returns the ID of the new song
    saveSong(songSrc) {
        const id = SongLibrary.songId++;
        const metadata = this.extractMetadata(songSrc);
        this.songs[id] = { id, metadata };
        this.saveSongToLocalStorage(songSrc, id);
        return id;
    }

    deleteSong(songId) {
        this.deleteSongFromLocalStorage(songId);
        this.songs[songId] = undefined;
    }

    async getSong(songId) {
        if (!this.songs[songId]) {
            throw new Error("Song not found");
        }
        const src = await this.readSongSrc(songId);
        const metadata = this.songs[songId].metadata;
        const song = { id: songId, src, metadata }; 
        return song;
    }
}