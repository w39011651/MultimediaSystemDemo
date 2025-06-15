export const VOICE_EVENT_TYPES = {
    JOIN_VOICE: 'join-voice', // Client to Server
    LEAVE_VOICE: 'leave-voice', // Client to Server
    VOICE_CHANNEL_STATUS: 'voice-channel-status', // Server to Client (after join, full list)
    VOICE_USER_JOINED: 'voice-user-joined',     // Server to Client (broadcast)
    VOICE_USER_LEFT: 'voice-user-left',       // Server to Client (broadcast)
    OFFER: 'offer', // Client to Server (offer)
    ANSWER: 'answer', // Server to Client (answer)
    CANDIDATE: 'candidate', // Client to Server (ICE candidate)
    VOICE_CHANNEL_MEMBERS_UPDATE: 'VOICE_CHANNEL_MEMBERS_UPDATE', // Server to Client (voice channel members update)
};

