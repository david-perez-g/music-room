let averageTimeDifferenceWithServer = 0;
let songs = [];
let songsInHTML = [];
let numberOfSongs = 0;
let currentSong;
const songPanel = document.getElementById("song-panel");
const uploadInput = document.getElementById("upload");

const socket = io();

socket.on("connect", _ => {
    console.log("Connection established with id:", socket.id);
    // calculating the average time difference between server and client
    setInterval(calculateTimeDifference, 60000);
});

socket.emit("join room", roomId);

socket.on("play", (songId, songPoint, timestamp) => {
    const playAt = timestamp + averageTimeDifferenceWithServer;
    setTimeout(_ => play(songId, songPoint), playAt - Date.now());
});

socket.on("refresh", _ => refreshUI());

// Calculate the average time difference between server and client
async function calculateTimeDifference() {
    const tests = 5;
    const promises = [];
    for (let i = 0; i < tests; i++) {
        socket.emit("get server time");
        promises.push(new Promise(resolve => socket.once("time", resolve)));
    }
    const times = await Promise.all(promises);
    const sum = times.reduce((acc, time) => acc + Date.now() - time, 0);
    averageTimeDifferenceWithServer = sum / tests;
}

function play(songNumber, songPoint) {
    if (currentSong && currentSong.id !== songNumber) {
        currentSong.pause();
        const img = document.getElementById(`img${currentSong.id}`);
        img.src = "/assets/images/play.png";
        currentSong.currentTime = 0;
    }

    currentSong = document.getElementById(songNumber);
    const image = document.getElementById(`img${songNumber}`);

    currentSong.currentTime = songPoint;
    if (currentSong.paused) {
        currentSong.play();
        image.src = "/assets/images/pause.png";
    } else {
        currentSong.pause();
        image.src = "/assets/images/play.png";
    }
}

// Will go through each song in the page and will set
// the next song to be played after each ends
function stablishPlaylistOrder() {
    const audios = songs.map(song => document.getElementById(song));

    for (let i = 0; i < audios.length; i++) {
        // the next song of the last song is the first song
        const nextId = audios[i + 1]?.id ?? audios[0].id; 
        audios
        audios[i].onended = _ => socket.emit("play", nextId, 0, roomId);
    }
}

function refreshUI() {
    socket.emit("retrieve songs", roomId);
    socket.once("songs", async data => {
        songs = data;
        await addSongsToHTML();
        stablishPlaylistOrder();
    });
}

async function getSong(songId) {
    const response = await fetch(`/api/get-song/${songId}`);
    if (response.ok) {
        const song = await response.text();
        return song;
    } else {
        console.error("Error getting song:", response.statusText);
        return null;
    }
}

async function addSongsToHTML() {
    songs
    songsToAdd = songs.filter(song => {
        return !songsInHTML.includes(song);
    });
    songsInHTML = [...songs, ...songsToAdd];

    const songPromises = songsToAdd.map(songId => getSong(songId));
    const songData = await Promise.all(songPromises);
    
    for (let i = songData.length - 1; i >= 0; i--) {
        const song = JSON.parse(songData[i]);

        const audio = document.createElement("audio");
        audio.controls = true;
        audio.src = song.src;
        audio.id = song.id;
    
        const img = document.createElement("img");
        img.id = `img${song.id}`;
        img.src = "/assets/images/play.png";
        img.onclick = _ => socket.emit("play", song.id, audio.currentTime, roomId);


        const container = document.createElement("div");
        container.className = "song";
        container.appendChild(audio);
        container.appendChild(img);

        songPanel.appendChild(container);
    }
}


async function sendSongToServer(src) {
    const response = await fetch(`/api/add-song/${roomId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ songSrc: src })
    });
    if (response.ok) {
        console.log('Song added successfully');
    } else {
        console.error('Error adding song:', response.statusText);
    }
}

async function uploadSongs() {
    const files = uploadInput.files;
    const promises = [];

    for (const file of files) {
        const promise = new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function (e) {
                sendSongToServer(e.target.result);
                resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        promises.push(promise);
    }

    await Promise.all(promises);
    refreshUI();
}