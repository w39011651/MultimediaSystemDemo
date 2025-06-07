module.exports = {
    WELCOME: "welcome",
    USER_JOINED: "user-joined",
    TEXT_MESSAGE: "text-message",
    JOIN_VOICE: 'join-voice', // Client to Server
    LEAVE_VOICE: 'leave-voice', // Client to Server
    VOICE_CHANNEL_STATUS: 'voice-channel-status', // Server to Client (after join, full list)
    VOICE_USER_JOINED: 'voice-user-joined',     // Server to Client (broadcast)
    VOICE_USER_LEFT: 'voice-user-left',       // Server to Client (broadcast)
    USER_LEFT: "user-left",
    GET_HISTORY: "get-history",
    OFFER: "offer",
    ANSWER: "answer",
    CANDIDATE: "candidate"
};