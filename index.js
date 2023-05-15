const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const { RoomLibrary } = require("./RoomLibrary");
const { SongLibrary } = require("./SongLibrary");

app.use(bodyParser.json({ limit: "50mb" }));
app.set("view engine", "ejs");

const rooms = new RoomLibrary();
const songs = new SongLibrary();

io.on("connection", (socket) => {
    console.log("[connection]", socket.id);

    socket.emit("refresh");

    socket.on("join room", (room) => {
        socket.join(room);
    });
  
    // notify play event to all the room users
    socket.on("play", (songId, songPoint, room) => {
        const delayMilliseconds = 150;
        const timestamp = Date.now() + delayMilliseconds;
        io.to(room).emit("play", songId, songPoint, timestamp);
    });
  
    socket.on("get server time", _ => socket.emit("time", Date.now()));

    // list the song IDs of the songs in the room
    socket.on("retrieve songs", async (room) => {
        let songs;
        try {
            songs = rooms.getRoomSongs(room);
        } catch (error) {
            return;
        }
        socket.emit("songs", songs);
    });

    socket.on("disconnecting", () => {
        console.log("[disconnection]", socket.id);
        
        for (const room of socket.rooms) {
            if (room === socket.id) {
                continue;
            }

            if (io.sockets.adapter.rooms.get(room).size !== 1) {
                continue;
            }
            
            // Delete the room 10 seconds after the last user leaves
            // If a user joins before this time the room is not deleted
            setTimeout(_ => {
                if (io.sockets.adapter.rooms.get(room)?.size > 0) {
                    return;
                }

                const roomSongs = rooms.getRoomSongs(room);
                for (const song of roomSongs) {
                    songs.deleteSong(song);
                }
                rooms.deleteRoom(room);

            }, 10000);
        }
    });
});

app.get("/", (req, res) => {
    res.render("menu");
})

app.get("/room/:room", (req, res) => {
    const room = req.params.room;
    
    if (!rooms.getRoom(room)) {
        rooms.addRoom(room);
    }
    
    res.render("room", {
        room: room
    });
})

// Add a song to the database
app.post("/api/add-song/:room", (req, res) => {
    const room = req.params.room;
    const src = req.body.songSrc;
    const id = songs.saveSong(src);
    rooms.addSongToRoom(room, id);
    io.to(room).emit("refresh");
}) 

// Return the wanted song
app.get("/api/get-song/:song", async (req, res) => {
    const songId = req.params.song;
    const song = await songs.getSong(songId);
    res.send(song);
})

app.get("/assets/*", (req, res) => {
    const path = req.path;
    res.sendFile(`${__dirname}${path}`);
}) 

app.get("*", (req, res) => {
    res.status(404).send("Sorry can't find that!");
})

const HOSTNAME = "192.168.233.203";
const PORT = 8080;

server.listen(PORT, HOSTNAME);
console.log(`Server listening at http://${HOSTNAME}:${PORT}`);