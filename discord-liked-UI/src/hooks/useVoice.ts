import { VOICE_EVENT_TYPES } from "../constant/events";
import { useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocketContext } from "./WebSocketProvider";
import type { User } from '../types';

export const useVoice = () => {
    const { myId, sendMessage, setVoiceMessageHandler, voiceChannelMembers, setVoiceChannelMembers } = useWebSocketContext();
    const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null);

    // 本地音訊串流
    const localStreamRef = useRef<MediaStream | null>(null);
    // 本地視訊串流
    const localVideoStreamRef = useRef<MediaStream | null>(null);

    // 遠端音訊/視訊串流
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
    const [remoteVideoStreams, setRemoteVideoStreams] = useState<Record<string, MediaStream>>({});

    // peerConnection 與 sender 用 Map 管理
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const audioSenders = useRef<Map<string, RTCRtpSender>>(new Map());
    const videoSenders = useRef<Map<string, RTCRtpSender>>(new Map());

    // 取得本地音訊（只取得一次）
    const getLocalAudioStream = async () => {
        if (!localStreamRef.current) {
            localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        return localStreamRef.current;
    };
    // 取得本地視訊流
    const getLocalVideoStream = async () => {
        if (!localVideoStreamRef.current) {
            localVideoStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        return localVideoStreamRef.current;
    };

    // 建立 PeerConnection 並初始化 transceiver、onnegotiationneeded
    const createPeerConnection = useCallback(async (userId: string) => {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
        peerConnections.current.set(userId, pc);

        // 預先建立 audio/video transceiver
        const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
        const videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' });
        audioSenders.current.set(userId, audioTransceiver.sender);
        videoSenders.current.set(userId, videoTransceiver.sender);

        // 設定 ontrack
        pc.ontrack = (event) => {
            if (event.track.kind === 'video') {
                event.track.onended = () => {
                    setRemoteVideoStreams(prev => {
                        const newStreams = { ...prev };
                        delete newStreams[userId];
                        return newStreams;
                    });
                };
                setRemoteVideoStreams(prev => ({
                    ...prev,
                    [userId]: event.streams[0]
                }));
            } else if (event.track.kind === 'audio') {
                setRemoteStreams(prev => ({
                    ...prev,
                    [userId]: event.streams[0]
                }));
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendMessage({
                    type: "candidate",
                    toId: userId,
                    fromId: myId,
                    candidate: event.candidate
                });
            }
        };

        // onnegotiationneeded：自動協商 offer
        pc.onnegotiationneeded = async () => {
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendMessage({
                    type: "offer",
                    toId: userId,
                    fromId: myId,
                    sdp: offer
                });
            } catch (err) {
                console.error(`Failed to create offer for ${userId}:`, err);
            }
        };

        // 一開始就 replaceTrack (如果有本地音訊/視訊)
        const localAudio = await getLocalAudioStream();
        if (audioSenders.current.get(userId) && localAudio.getAudioTracks()[0]) {
            audioSenders.current.get(userId)!.replaceTrack(localAudio.getAudioTracks()[0]);
        }
        if (videoSenders.current.get(userId) && localVideoStreamRef.current && localVideoStreamRef.current.getVideoTracks()[0]) {
            videoSenders.current.get(userId)!.replaceTrack(localVideoStreamRef.current.getVideoTracks()[0]);
        }

        return pc;
    }, [myId, sendMessage]);

    const handleVoiceMessage = useCallback((msg: any) => {
        switch (msg.type) {
            case VOICE_EVENT_TYPES.VOICE_CHANNEL_STATUS:
                if (msg.channelId && msg.users) {
                    const users: User[] = msg.users.map((u: { userId: string, userName: string }) => ({
                        id: u.userId,
                        name: u.userName || u.userId,
                        status: 'online',
                    }));
                    setVoiceChannelMembers((prev: Record<string, User[]>) => {
                        const newState = { ...prev, [msg.channelId]: users };
                        return newState;
                    });
                    if (activeVoiceChannelId !== msg.channelId) {
                        setActiveVoiceChannelId(msg.channelId);
                    }
                    // 新加入的人對所有舊人建立 peerConnection
                    msg.users.forEach(async (u: { userId: string, userName: string }) => {
                        if (u.userId !== myId && !peerConnections.current.has(u.userId)) {
                            await createPeerConnection(u.userId);
                            // 不用主動 createOffer，onnegotiationneeded 會自動協商
                        }
                    });
                }
                break;
            case VOICE_EVENT_TYPES.VOICE_USER_JOINED:
                if (msg.channelId && msg.userId) {
                    const newUser: User = {
                        id: msg.userId,
                        name: msg.userName || msg.userId,
                        status: 'online',
                    };
                    setVoiceChannelMembers((prev: Record<string, User[]>) => {
                        const currentChannelUsers = prev[msg.channelId] || [];
                        if (currentChannelUsers.find(u => u.id === newUser.id)) {
                            return prev;
                        }
                        const updatedUsers = [...currentChannelUsers, newUser];
                        return { ...prev, [msg.channelId]: updatedUsers };
                    });
                    // 舊成員只建立 peerConnection，不主動發 offer
                    if (msg.userId !== myId && !peerConnections.current.has(msg.userId)) {
                        createPeerConnection(msg.userId);
                    }
                }
                break;
            case VOICE_EVENT_TYPES.VOICE_USER_LEFT:
                if (msg.channelId && msg.userId) {
                    setVoiceChannelMembers((prev: Record<string, User[]>) => {
                        const currentChannelUsers = prev[msg.channelId] || [];
                        const updatedUsers = currentChannelUsers.filter(u => u.id !== msg.userId);
                        const newState = { ...prev, [msg.channelId]: updatedUsers };
                        return newState;
                    });
                    if (peerConnections.current.has(msg.userId)) {
                        peerConnections.current.get(msg.userId)!.close();
                        peerConnections.current.delete(msg.userId);
                        audioSenders.current.delete(msg.userId);
                        videoSenders.current.delete(msg.userId);
                    }
                    setRemoteStreams(prev => {
                        const newStreams = { ...prev };
                        delete newStreams[msg.userId];
                        return newStreams;
                    });
                    setRemoteVideoStreams(prev => {
                        const newStreams = { ...prev };
                        delete newStreams[msg.userId];
                        return newStreams;
                    });
                    if (msg.userId === myId && msg.channelId === activeVoiceChannelId) {
                        setActiveVoiceChannelId(null);
                    }
                }
                break;
            case VOICE_EVENT_TYPES.OFFER: {
                const fromId = msg.fromId;
                const handleOffer = async () => {
                    if (!peerConnections.current.has(fromId)) {
                        await createPeerConnection(fromId);
                    }
                    const pc = peerConnections.current.get(fromId)!;
                    // 只在 stable 狀態下 setRemoteDescription
                    if (pc.signalingState !== "stable") {
                        console.warn('OFFER received but signalingState is not stable:', pc.signalingState);
                        return;
                    }
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                    // replaceTrack (如果有本地音訊/視訊)
                    const localAudio = await getLocalAudioStream();
                    if (audioSenders.current.get(fromId) && localAudio.getAudioTracks()[0]) {
                        audioSenders.current.get(fromId)!.replaceTrack(localAudio.getAudioTracks()[0]);
                    }
                    if (videoSenders.current.get(fromId) && localVideoStreamRef.current && localVideoStreamRef.current.getVideoTracks()[0]) {
                        videoSenders.current.get(fromId)!.replaceTrack(localVideoStreamRef.current.getVideoTracks()[0]);
                    }
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendMessage({
                        type: "answer",
                        toId: fromId,
                        fromId: myId,
                        sdp: answer
                    });
                };
                handleOffer();
                break;
            }
            case VOICE_EVENT_TYPES.ANSWER: {
                const fromId = msg.fromId;
                const pc = peerConnections.current.get(fromId);
                if (pc && pc.signalingState === "have-local-offer") {
                    pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                }
                break;
            }
            case VOICE_EVENT_TYPES.CANDIDATE: {
                const fromId = msg.fromId;
                const pc = peerConnections.current.get(fromId);
                if (pc && msg.candidate) {
                    pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
                }
                break;
            }
            case "camera-off":
                if (videoSenders.current.get(msg.fromId)) {
                    videoSenders.current.get(msg.fromId)!.replaceTrack(null);
                }
                setRemoteVideoStreams(prev => {
                    const newStreams = { ...prev };
                    delete newStreams[msg.fromId];
                    return newStreams;
                });
                break;
            case "camera-on":
                // 可選：收到 camera-on 時可重新協商 offer
                break;
            case VOICE_EVENT_TYPES.VOICE_CHANNEL_MEMBERS_UPDATE:
                setVoiceChannelMembers(msg.members);
                break;
            default:
                console.warn('[useVoice] Unhandled voice message type:', msg.type);
        }
    }, [myId, activeVoiceChannelId, setActiveVoiceChannelId, setVoiceChannelMembers, sendMessage, createPeerConnection]);

    useEffect(() => {
        if (setVoiceMessageHandler) {
            setVoiceMessageHandler(handleVoiceMessage);
        }
        return () => {
            if (setVoiceMessageHandler) {
                setVoiceMessageHandler(null);
            }
        };
    }, [setVoiceMessageHandler, handleVoiceMessage]);

    const joinVoiceChannel = useCallback((channelId: string) => {
        if (channelId === activeVoiceChannelId) {
            return;
        }
        leaveCurrentVoiceChannel();
        if (activeVoiceChannelId && sendMessage) {
            sendMessage({
                type: VOICE_EVENT_TYPES.LEAVE_VOICE,
                payload: { channelId: activeVoiceChannelId },
            });
            setVoiceChannelMembers((prev: Record<string, User[]>) => {
                const newState = {...prev};
                if (activeVoiceChannelId) {
                    delete newState[activeVoiceChannelId];
                }
                return newState;
            });
        }
        if (sendMessage) {
            sendMessage({
                type: VOICE_EVENT_TYPES.JOIN_VOICE,
                payload: { channelId },
            });
            setActiveVoiceChannelId(channelId);
        }
    }, [activeVoiceChannelId, sendMessage, myId, setActiveVoiceChannelId, setVoiceChannelMembers]);

    // 新增：開關鏡頭
    const [isCameraOn, setIsCameraOn] = useState(false);
    const toggleCamera = useCallback(async () => {
        if (!isCameraOn) {
            // 開啟鏡頭
            const videoStream = await getLocalVideoStream();
            setIsCameraOn(true);
            for (const [, sender] of videoSenders.current.entries()) {
                if (videoStream.getVideoTracks()[0]) {
                    await sender.replaceTrack(videoStream.getVideoTracks()[0]);
                }
            }
            for (const userId of peerConnections.current.keys()) {
                sendMessage({
                    type: "camera-on",
                    toId: userId,
                    fromId: myId
                });
            }
        } else {
            // 關閉鏡頭
            if (localVideoStreamRef.current) {
                localVideoStreamRef.current.getTracks().forEach(track => track.stop());
                localVideoStreamRef.current = null;
            }
            setIsCameraOn(false);
            for (const sender of videoSenders.current.values()) {
                await sender.replaceTrack(null);
            }
            for (const userId of peerConnections.current.keys()) {
                sendMessage({
                    type: "camera-off",
                    toId: userId,
                    fromId: myId
                });
            }
        }
    }, [isCameraOn, sendMessage, myId]);

    // 離開語音頻道時清理
    const leaveCurrentVoiceChannel = useCallback(() => {
        for (const pc of peerConnections.current.values()) {
            pc.close();
        }
        peerConnections.current.clear();
        audioSenders.current.clear();
        videoSenders.current.clear();
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (localVideoStreamRef.current) {
            localVideoStreamRef.current.getTracks().forEach(track => track.stop());
            localVideoStreamRef.current = null;
        }
        setRemoteStreams({});
        setRemoteVideoStreams(prev => {
            Object.values(prev).forEach(stream => {
                if (stream) stream.getTracks().forEach(track => track.stop());
            });
            return {};
        });
        setIsCameraOn(false);

        if (activeVoiceChannelId && sendMessage) {
            sendMessage({
                type: VOICE_EVENT_TYPES.LEAVE_VOICE,
                payload: { channelId: activeVoiceChannelId },
            });
            setActiveVoiceChannelId(null);
            setVoiceChannelMembers((prev: Record<string, User[]>) => {
                const newState = { ...prev };
                delete newState[activeVoiceChannelId];
                return newState;
            });
        }
    }, [activeVoiceChannelId, sendMessage, setActiveVoiceChannelId, setVoiceChannelMembers]);

    return {
        activeVoiceChannelId,
        voiceChannelMembers,
        joinVoiceChannel,
        leaveCurrentVoiceChannel,
        localStream: localStreamRef.current,
        remoteStreams,
        localVideoStream: localVideoStreamRef.current,
        remoteVideoStreams,
        isCameraOn,
        toggleCamera,
    };
};