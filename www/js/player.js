"use strict";
const YOUTUBE_URL = "https://youtube.com/watch?v=";
const GATEWAY_URL = (location.protocol == "https:" ? "wss://" : "ws://") + location.host + "/gateway";
let Gateway = new WebSocket(GATEWAY_URL);

let Globals = {
    USER_PROPERTIES: {},
    TOKEN: "",
    PLAYER: {},
    CURRENT_VIDEO_ID: "",
    ROOM_ID: "",
    LAST_MESSAGE_AUTHOR: "",
    CAN_CONTROL_PLAYER: false,
    ROOM_COLOUR: "",
    TYPING_COUNT: 0,
    TYPING: false,
    PLAYER_READY: false,
}

const messageContainer = document.getElementById('messageContainer');
const messageInput = document.getElementById('messageInput');

function sendGatewayMessage(message) {
    Gateway.send(JSON.stringify(message));
}

function data(params) {
    const defaultParams = { token: Globals.TOKEN, roomID: Globals.ROOM_ID };
    return { ...defaultParams, ...params };
}

function showTypingMessage() {
    document.getElementById("typing-message").style.display = "block";
}

function hideTypingMessage() {
    document.getElementById("typing-message").style.display = "none";
}

function updateTyping(data) {
    if (data.user == Globals.USER_PROPERTIES.username) return;
    if (data.mode == "start") Globals.TYPING_COUNT = Globals.TYPING_COUNT + 1;
    else Globals.TYPING_COUNT = Globals.TYPING_COUNT - 1;

    if (Globals.TYPING_COUNT > 0) showTypingMessage();
    else hideTypingMessage();
};

function getAvatarUrl(avatar) {
    if (avatar == "system") return "/img/favicon.png";
    else return `/img/avatars/${avatar}.png`;
}

function addChatMessage(data) {
    const author = data.author;
    const colour = data.colour;
    const content = data.content;
    const avatar = data.avatar;

    const newMessage = document.createElement('div');
    newMessage.className = 'message';

    if (Globals.LAST_MESSAGE_AUTHOR !== author) {
        Globals.LAST_MESSAGE_AUTHOR = author;
        const avatarElement = document.createElement('img');
        avatarElement.className = 'avatar';
        avatarElement.src = getAvatarUrl(avatar);

        const username = document.createElement('h4');
        username.className = 'username';
        username.textContent = author;
        username.style.color = colour;
        username.style.fontFamily = "Paytone One";

        const messageHeader = document.createElement('div');
        messageHeader.className = 'message-header';
        messageHeader.appendChild(avatarElement);
        messageHeader.appendChild(username);

        newMessage.appendChild(messageHeader);
    }

    const messageContent = document.createElement('p');
    messageContent.innerHTML = DOMPurify.sanitize(marked.parse(content));
    messageContent.className = "message-content"

    newMessage.appendChild(messageContent);

    messageContainer.insertBefore(newMessage, messageContainer.firstChild);
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

function displayLocalMessage(message) {
    addChatMessage({ "author": "System", "colour": Globals.ROOM_COLOUR, "content": message, "avatar": "system" });
}

function sendPlayingMessage() {
    const time = Globals.PLAYER.getCurrentTime();
    sendGatewayMessage({ "type": "party-playvideo", "data": data({ "timestamp": time }) });
    displayLocalMessage("Video playing at " + new Date(time * 1000).toISOString().substr(11, 8));
}

function sendPausedMessage() {
    sendGatewayMessage({ "type": "party-pausevideo", "data": data() });
    displayLocalMessage("Video paused");
}

function sendVideoEndedMessage() {
    sendGatewayMessage({ "type": "party-videoend", "data": data() });
    displayLocalMessage("Video ended!");
}

function onYouTubeIframeAPIReady() {
    Globals.PLAYER = new YT.Player('player', {
        height: '100%',
        width: '80%',
        playerVars: { 'controls': Globals.CAN_CONTROL_PLAYER ? 1 : 0, 'disablekb': Globals.CAN_CONTROL_PLAYER ? 0 : 1 },
        videoId: Globals.CURRENT_VIDEO_ID,
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady() {
    Globals.PLAYER_READY = true;
}

function onPlayerStateChange(event) {
    let playerState = event.data;
    switch (playerState) {
        case 0: //0 = video ended
            sendVideoEndedMessage();
            break;
        case 1: //1 = video playing
            sendPlayingMessage();
            break;
        case 2: //2 = video paused
            sendPausedMessage();
            break;
    }
}

function loadVideo(youTubeVideoID) {
    Globals.CURRENT_VIDEO_ID = youTubeVideoID;
    if (Globals.PLAYER_READY) Globals.PLAYER.loadVideoById(youTubeVideoID, 0);
}

function startVideo(data) {
    if (Globals.PLAYER.getPlayerState() !== YT.PlayerState.PLAYING) {
        Globals.PLAYER.seekTo(data.time, true);
        Globals.PLAYER.playVideo();
    }
}

function pauseVideo() {
    if (Globals.PLAYER.getPlayerState() !== YT.PlayerState.PAUSED) {
        Globals.PLAYER.pauseVideo();
    }
}

function convertVideoList(videos) {
    if (videos.length == 0) return "No videos queued!";
    else {
        let videosFormatted = [];
        videos.forEach(video => {
            videosFormatted.push("<a href='" + YOUTUBE_URL + video + "'>" + video + "</a>");
        });
        return videosFormatted.join("<br>");
    }
}

function refreshModalQueueData(videos) {
    let message = convertVideoList(videos);
    document.getElementById("queue-items").innerHTML = message + "<br><br>";
    document.getElementById("queue-title").innerHTML = "Queued Items (" + videos.length + ")";
}

function initialiseParty(options) {
    loadVideo(options.video);
    Globals.CAN_CONTROL_PLAYER = options.canControl;
    Globals.ROOM_COLOUR = options.theme;

    document.getElementsByTagName("title")[0].text = options.owner + "'s room!";

    let chatInput = document.getElementById("chat-input");
    chatInput.addEventListener("focus", function () {
        this.style.borderBottom = "2px solid " + Globals.ROOM_COLOUR;
    });


    chatInput.addEventListener("blur", function () {
        this.style.borderBottom = "2px solid grey";
    });

    displayLocalMessage("Use /help to see some chat commands! Use ctrl + m to open the player menu!");
}

function hideLoadingScreen() {
    let screen = document.getElementById("loading-screen");
    screen.classList.add("loaded");
    setTimeout(() => {
        screen.style.display = "none";
    }, 500);
}

function handleGatewayMessage(packet) {
    switch (packet.type) {
        case "party-partyready":
            hideLoadingScreen();
            break;
        case "party-chatmessage":
            addChatMessage(packet.data);
            break;
        case "party-joinparty":
            initialiseParty(packet.response);
            break;
        case "user-getprofile":
            Globals.USER_PROPERTIES = packet.response;
            break;
        case "party-playvideo":
            startVideo(packet.data);
            break;
        case "party-pausevideo":
            pauseVideo();
            break;
        case "party-changevideo":
            loadVideo(packet.data.video);
            break;
        case "party-typingupdate":
            updateTyping(packet.data);
            break;
        case "party-getqueue":
            refreshModalQueueData(packet.response.videos);
            break;
    }
}

function getToken() {
    let token = window.localStorage.getItem("token");
    if (token == null) window.location.href = location.protocol + "//" + location.host + "/html/login.html?redirect=" + location.pathname + location.search;
    else return token;
}

function embedPlayer() {
    let tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    let firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

function sendTypingStop() {
    if (Globals.TYPING) {
        Globals.TYPING = false;
        sendGatewayMessage({ "type": "party-typingupdate", "data": data({ "mode": "stop", "user": Globals.USER_PROPERTIES.username }) });
    }
}

function sendTypingStart() {
    if (!Globals.TYPING) {
        Globals.TYPING = true;
        sendGatewayMessage({ "type": "party-typingupdate", "data": data({ "mode": "start", "user": Globals.USER_PROPERTIES.username }) });
    }
}

document.getElementById("chat-input").addEventListener("keyup", function (event) {
    if (event.key == "Enter") {
        sendTypingStop();
        event.preventDefault();
        let message = document.getElementById("chat-input").value.trim();
        if (message == "") return;
        if (message.length > 2000) {
            displayLocalMessage("Your message is too long! Messages cannot be longer than 2000 characters.");
            return;
        }

        sendGatewayMessage({
            "type": "party-chatmessage",
            "data": {
                "token": Globals.TOKEN,
                "roomID": Globals.ROOM_ID,
                "content": message,
                "colour": Globals.USER_PROPERTIES.colour,
                "author": Globals.USER_PROPERTIES.effectiveName,
                "avatar": Globals.USER_PROPERTIES.avatar
            }
        });

        document.getElementById("chat-input").value = "";
    } else {
        let message = document.getElementById("chat-input").value.trim();
        if (message == "") sendTypingStop();
        else sendTypingStart();
    }
});

//GUI FUNCTIONS

function refreshQueue() {
    sendGatewayMessage({ "type": "party-getqueue", "data": data() });
}

window.addEventListener("keydown", function (event) {
    if (event.code == "KeyM" && event.ctrlKey) { //Ctrl + M
        refreshQueue();
        let copyButton = document.getElementById("copy-button");
        if (copyButton.classList.contains("action-complete")) copyButton.classList.remove("action-complete");
        showModalMenu();
    }
});

//Change current video
document.getElementById("current-video-input").addEventListener("keyup", function (event) {
    if (event.key == "Enter") {
        event.preventDefault();
        let videoURL = document.getElementById("current-video-input").value.trim();
        document.getElementById("current-video-input").value = "";
        if (videoURL == "") return;
        setVideo(videoURL);
    }
});

//Add to queue
document.getElementById("queue-input").addEventListener("keyup", function (event) {
    if (event.key == "Enter") {
        event.preventDefault();
        let videoURL = document.getElementById("queue-input").value.trim();
        document.getElementById("queue-input").value = "";
        if (videoURL == "") return;
        let videoURLClass = new URL(videoURL);
        let videoID = videoURLClass.searchParams.get("v");
        if (videoID) {
            sendGatewayMessage({ "type": "party-queuevideo", "data": data({ "video": videoID }) });
            refreshQueue();
        }
    }
});

//Set a new video
function setVideo(video) {
    let videoURL = new URL(video);
    let videoID = videoURL.searchParams.get("v");
    if (videoID) sendGatewayMessage({ "type": "party-changevideo", "data": data({ "video": videoID }) });
}

//Skip the current video
function skipVideo() {
    sendGatewayMessage({ "type": "party-skipvideo", "data": data() });
    refreshQueue();
}

//Clear the queue
function clearQueue() {
    sendGatewayMessage({ "type": "party-clearqueue", "data": data() });
    refreshQueue();
}

//Do this when the copy button is pressed
function copyRoomURL() {
    if (document.getElementById("copy-button").classList.contains("action-complete")) return;
    navigator.clipboard.writeText(location.href).then(function () {
        console.log('Copied room URL');
    }, function (err) {
        console.error('Could not copy room URL: ', err);
    });
    document.getElementById("copy-button").classList.add("action-complete");
}

//Handle a gateway connection
Gateway.onopen = function () {
    console.log("Connected To Gateway");
    hideTypingMessage();
    const selfURL = new URL(location.href);
    Globals.TOKEN = getToken();

    if (!selfURL.searchParams.get("roomID")) window.location.href = location.protocol + "//" + location.host + "/html/home.html";
    else {
        Globals.ROOM_ID = selfURL.searchParams.get("roomID");
        embedPlayer();
        sendGatewayMessage({ "type": "party-joinparty", "data": data() });
        sendGatewayMessage({ "type": "user-getprofile", "data": { "token": Globals.TOKEN } });
    }
}

//Handle gateway closure
Gateway.onclose = function (event) {
    console.log(`Gateway Disconnected\n\nCode: ${event.code}\nReason: ${event.reason}\nClean?: ${event.wasClean}`);
    displayLocalMessage("You lost connection to the server! Use /r to reconnect");
}

//Handle gateway messages
Gateway.onmessage = function (message) {
    const packet = JSON.parse(message.data);
    console.log(packet);
    if (packet.hasOwnProperty("success")) {
        if (!packet.success) displayLocalMessage(packet.response);
        else handleGatewayMessage(packet);
    } else handleGatewayMessage(packet);
}