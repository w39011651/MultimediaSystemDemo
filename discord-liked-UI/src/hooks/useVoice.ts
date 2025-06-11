import { VOICE_EVENT_TYPES } from "../constant/events";
import { useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocketContext } from "./WebSocketProvider";
import type { User } from '../types';

const peerConnections: Record<string, RTCPeerConnection> = {};

export const useVoice = () => {
    const { myId, sendMessage, setVoiceMessageHandler, voiceChannelMembers, setVoiceChannelMembers } = useWebSocketContext();
    const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null);

    // 本地音訊串流
    const localStreamRef = useRef<MediaStream | null>(null);
    // 遠端音訊串流（可用 state 管理多個 user）
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
    // 本地視訊串流
    const localVideoStreamRef = useRef<MediaStream | null>(null);
    const [remoteVideoStreams, setRemoteVideoStreams] = useState<Record<string, MediaStream>>({});


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

    const handleVoiceMessage = useCallback((msg: any) => {
        console.log("[useVoice] Received voice message in handleVoiceMessage:", msg);
        switch (msg.type) {
            case VOICE_EVENT_TYPES.VOICE_CHANNEL_STATUS: // 伺服器回應加入頻道，提供完整成員列表
                if (msg.channelId && msg.users) {
                    const users: User[] = msg.users.map((u: { userId: string, userName: string }) => ({
                        id: u.userId,
                        name: u.userName || u.userId, // 如果沒有 userName，暫用 userId
                        status: 'online', // 預設狀態，可擴展
                    }));
                    console.log(`[useVoice] VOICE_CHANNEL_STATUS: Setting voiceChannelMembers for ${msg.channelId}:`, users); // DEBUG
                    setVoiceChannelMembers((prev: Record<string, User[]>) => {
                        const newState = { ...prev, [msg.channelId]: users };
                        console.log("[useVoice] VOICE_CHANNEL_STATUS: New voiceChannelMembers state (inside setter):", newState);
                        return newState;
                    });
                    console.log(`[useVoice] Setting activeVoiceChannelId: ${msg.channelId}`); // DEBUG
                    if (activeVoiceChannelId !== msg.channelId) {
                         console.log(`[useVoice] VOICE_CHANNEL_STATUS: Updating activeVoiceChannelId from ${activeVoiceChannelId} to ${msg.channelId} based on server confirmation.`);
                         setActiveVoiceChannelId(msg.channelId);
                    }

                    // 對每個其他 user 建立 WebRTC offer
                    msg.users.forEach(async (u: { userId: string, userName: string }) => {
                        if (u.userId !== myId && !peerConnections[u.userId]) {
                            const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
                            peerConnections[u.userId] = pc;

                            // 接收遠端音訊
                            pc.ontrack = (event) => {
                                if (event.track.kind === 'video') {
                                    // 監聽 track ended 事件
                                    event.track.onended = () => {
                                        setRemoteVideoStreams(prev => {
                                            const newStreams = { ...prev };
                                            delete newStreams[u.userId]; // 或 fromId
                                            return newStreams;
                                        });
                                    };
                                    setRemoteVideoStreams(prev => ({
                                        ...prev,
                                        [u.userId]: event.streams[0]
                                    }));
                                } else if (event.track.kind === 'audio') {
                                    setRemoteStreams(prev => ({
                                        ...prev,
                                        [u.userId]: event.streams[0]
                                    }));
                                }
                                // 你可以加 log
                                console.log('[WebRTC] 收到遠端音訊流:', event.streams[0]);
                            };

                            // 這段要放在 addTrack 之前
                            pc.addTransceiver('video', { direction: 'recvonly' }); // 讓自己可以收視訊

                            // 如果自己有開鏡頭，再加 video track
                            if (localVideoStreamRef.current) {
                                localVideoStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localVideoStreamRef.current!));
                            }

                            // 加入本地音訊
                            const localStream = await getLocalAudioStream();
                            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

                            pc.onicecandidate = (event) => {
                                if (event.candidate) {
                                    sendMessage({
                                        type: "candidate",
                                        toId: u.userId,
                                        fromId: myId,
                                        candidate: event.candidate
                                    });
                                }
                            };

                            // 建立 offer
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            sendMessage({
                                type: "offer",
                                toId: u.userId,
                                fromId: myId,
                                sdp: offer
                            });
                        }
                    });
                }
                break;
            case VOICE_EVENT_TYPES.VOICE_USER_JOINED: // 其他使用者加入目前所在的語音頻道
                if (msg.channelId && msg.userId) {
                    const newUser: User = {
                        id: msg.userId,
                        name: msg.userName || msg.userId,
                        status: 'online',
                    };
                    console.log(`[useVoice] VOICE_CHANNEL_STATUS: Setting voiceChannelMembers for ${msg.channelId}:`, newUser.id); 
                    
                    // 關鍵點：這裡的狀態更新是否正確觸發並傳播？
                    setVoiceChannelMembers((prev: Record<string, User[]>) => {
                        console.log(`[useVoice] VOICE_USER_JOINED: prev state for channel ${msg.channelId}:`, prev[msg.channelId]); // 新增日誌
                        const currentChannelUsers = prev[msg.channelId] || [];
                        // 避免重複添加同一使用者
                        if (currentChannelUsers.find(u => u.id === newUser.id)) {
                            console.log(`[useVoice] VOICE_USER_JOINED: User ${newUser.id} already in channel ${msg.channelId}. Skipping.`);
                            return prev; // 使用者已存在，不更新
                        }
                        const updatedUsers = [...currentChannelUsers, newUser];
                        return { ...prev, [msg.channelId]: updatedUsers };
                    });

                    // === 新增：如果新 user 不是自己，主動建立 peerConnection 並發 offer ===
                    if (msg.userId !== myId && !peerConnections[msg.userId]) {
                        const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
                        peerConnections[msg.userId] = pc;

                        // 設定 ontrack
                        pc.ontrack = (event) => {
                            if (event.track.kind === 'video') {
                                // 監聽 track ended 事件
                                event.track.onended = () => {
                                    setRemoteVideoStreams(prev => {
                                        const newStreams = { ...prev };
                                        delete newStreams[msg.userId]; // 或 fromId
                                        return newStreams;
                                    });
                                };
                                setRemoteVideoStreams(prev => ({
                                    ...prev,
                                    [msg.userId]: event.streams[0]
                                }));
                            } else if (event.track.kind === 'audio') {
                                setRemoteStreams(prev => ({
                                    ...prev,
                                    [msg.userId]: event.streams[0]
                                }));
                            }
                        };

                        // 先加 transceiver
                        pc.addTransceiver('video', { direction: 'recvonly' });

                        // 如果自己有開鏡頭，加 video track
                        if (localVideoStreamRef.current) {
                            localVideoStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localVideoStreamRef.current!));
                        }

                        // 加入本地音訊
                        getLocalAudioStream().then(localStream => {
                            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
                        });

                        pc.onicecandidate = (event) => {
                            if (event.candidate) {
                                sendMessage({
                                    type: "candidate",
                                    toId: msg.userId,
                                    fromId: myId,
                                    candidate: event.candidate
                                });
                            }
                        };

                        // 建立 offer
                        (async () => {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            sendMessage({
                                type: "offer",
                                toId: msg.userId,
                                fromId: myId,
                                sdp: offer
                            });
                        })();
                    }
                }
                break;
            case VOICE_EVENT_TYPES.VOICE_USER_LEFT: // 其他使用者離開目前所在的語音頻道
                if (msg.channelId && msg.userId) {
                    console.log(`[useVoice] VOICE_USER_LEFT: User ${msg.userId} left channel ${msg.channelId}`);
                    setVoiceChannelMembers((prev: Record<string, User[]>) => {
                        const currentChannelUsers = prev[msg.channelId] || [];
                        const updatedUsers = currentChannelUsers.filter(u => u.id !== msg.userId);
                        const newState = { ...prev, [msg.channelId]: updatedUsers };
                        console.log("[useVoice] VOICE_USER_LEFT: New voiceChannelMembers state (inside setter):", newState);
                        return newState;
                    });
                    // 關閉與該 user 的 peerConnection
                    if (peerConnections[msg.userId]) {
                        peerConnections[msg.userId].close();
                        delete peerConnections[msg.userId];
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
                        console.log(`[useVoice] VOICE_USER_LEFT: Current user left active channel. Setting activeVoiceChannelId to null.`);
                        setActiveVoiceChannelId(null);
                    }
                } else {
                    console.warn("[useVoice] VOICE_USER_LEFT: Missing channelId or userId in message:", msg);
                }
                break;
            case VOICE_EVENT_TYPES.OFFER: {
                const fromId = msg.fromId;
                if (!peerConnections[fromId]) {
                    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
                    peerConnections[fromId] = pc;

                    // 接收遠端音訊
                    pc.ontrack = (event) => {
                        setRemoteStreams(prev => ({
                            ...prev,
                            [fromId]: event.streams[0]
                        }));
                        // 你可以加 log
                        console.log('[WebRTC] 收到遠端音訊流:', event.streams[0]);
                    };

                    // 這段要放在 addTrack 之前
                    pc.addTransceiver('video', { direction: 'recvonly' }); // 讓自己可以收視訊

                    // 如果自己有開鏡頭，再加 video track
                    if (localVideoStreamRef.current) {
                        localVideoStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localVideoStreamRef.current!));
                    }

                    // 加入本地音訊
                    getLocalAudioStream().then(localStream => {
                        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
                    });



                    pc.onicecandidate = (event) => {
                        if (event.candidate) {
                            sendMessage({
                                type: "candidate",
                                toId: fromId,
                                fromId: myId,
                                candidate: event.candidate
                            });
                        }
                    };
                }
                const pc = peerConnections[fromId];
                pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)).then(async () => {
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendMessage({
                        type: "answer",
                        toId: fromId,
                        fromId: myId,
                        sdp: answer
                    });
                });
                break;
            }
            case VOICE_EVENT_TYPES.ANSWER: {
                const fromId = msg.fromId;
                const pc = peerConnections[fromId];
                if (pc) {
                    pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                }
                break;
            }
            case VOICE_EVENT_TYPES.CANDIDATE: {
                const fromId = msg.fromId;
                const pc = peerConnections[fromId];
                if (pc && msg.candidate) {
                    pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
                }
                break;
            }
            case "camera-off":
                if (peerConnections[msg.fromId]) {
                    peerConnections[msg.fromId].close();
                    delete peerConnections[msg.fromId];
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
            default:
                console.warn('[useVoice] Unhandled voice message type:', msg.type);
        }
    }, [myId, activeVoiceChannelId, setActiveVoiceChannelId, setVoiceChannelMembers, sendMessage]);

    useEffect(() => {
        if (setVoiceMessageHandler) {
            console.log("[useVoice] Setting voice message handler"); // DEBUG
            setVoiceMessageHandler(handleVoiceMessage);
        }
        return () => {
            if (setVoiceMessageHandler) {
                setVoiceMessageHandler(null); // 清理回呼
            }
        };
    }, [setVoiceMessageHandler, handleVoiceMessage]);

    const joinVoiceChannel = useCallback((channelId: string) => {
        if (channelId === activeVoiceChannelId) {
            console.log(`Already in voice channel: ${channelId}`);
            return; // 已經在該頻道
        }
        leaveCurrentVoiceChannel();
        // 如果已在其他語音頻道，先發送離開訊息
        if (activeVoiceChannelId && sendMessage) {
            sendMessage({
                type: VOICE_EVENT_TYPES.LEAVE_VOICE, // 使用 VOICE_EVENT_TYPES.LEAVE_VOICE
                payload: { channelId: activeVoiceChannelId },
            });
            // 可以選擇性地在這裡清除舊頻道的成員列表，或等待伺服器確認
            // 樂觀地清除舊頻道的成員，或者等待伺服器確認
            setVoiceChannelMembers((prev: Record<string, User[]>) => {
                const newState = {...prev};
                if (activeVoiceChannelId) { // 確保 activeVoiceChannelId 不是 null
                    delete newState[activeVoiceChannelId];
                }
                return newState;
            });
        }
        console.log(`[useVoice] Attempting to join voice channel: ${channelId}. Current active: ${activeVoiceChannelId}`); // DEBUG
        // 發送加入新語音頻道的訊息
        if (sendMessage) {
            sendMessage({
                type: VOICE_EVENT_TYPES.JOIN_VOICE, // 使用 VOICE_EVENT_TYPES.JOIN_VOICE
                payload: { channelId },
            });
            console.log(`[useVoice] Sent 'join-voice' for channel: ${channelId}`); // DEBUG
            // 可以選擇樂觀更新 activeVoiceChannelId，或等待伺服器的 'voice-channel-status'
            setActiveVoiceChannelId(channelId); 
        } else {
            console.error("sendMessage is not available from useWebSocket");
        }
    }, [activeVoiceChannelId, sendMessage, myId, setActiveVoiceChannelId, setVoiceChannelMembers]);

    // 新增：開關鏡頭
    const [isCameraOn, setIsCameraOn] = useState(false);
    const toggleCamera = useCallback(async () => {
        if (!isCameraOn) {
            // 開啟鏡頭
            const videoStream = await getLocalVideoStream();
            setIsCameraOn(true);
            // 加到所有 peerConnection
            Object.entries(peerConnections).forEach(async ([userId, pc]) => {
                videoStream.getVideoTracks().forEach(track => {
                    pc.addTrack(track, videoStream);
                });
                // 重新協商
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendMessage({
                    type: "offer",
                    toId: userId,
                    fromId: myId,
                    sdp: offer
                });
            });
            // 新增：通知所有 peer 我已開啟鏡頭
            Object.keys(peerConnections).forEach(userId => {
                sendMessage({
                    type: "camera-on",
                    toId: userId,
                    fromId: myId
                });
            });
        } else {
            // 關閉鏡頭
            if (localVideoStreamRef.current) {
                localVideoStreamRef.current.getTracks().forEach(track => track.stop());
                localVideoStreamRef.current = null;
            }
            setIsCameraOn(false);
            // 通知所有 peerConnection 移除 video track
            Object.entries(peerConnections).forEach(async ([userId, pc]) => {
                pc.getSenders().forEach(sender => {
                    if (sender.track && sender.track.kind === 'video') {
                        pc.removeTrack(sender);
                    }
                });
                // 重新協商
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendMessage({
                    type: "offer",
                    toId: userId,
                    fromId: myId,
                    sdp: offer
                });
            });
            // 新增：通知所有 peer 我已關閉鏡頭
            Object.keys(peerConnections).forEach(userId => {
                sendMessage({
                    type: "camera-off",
                    toId: userId,
                    fromId: myId
                });
            });
        }
    }, [isCameraOn, sendMessage, myId]);

    // 離開語音頻道時清理
    const leaveCurrentVoiceChannel = useCallback(() => {
            // 關閉所有 peerConnection
            Object.values(peerConnections).forEach(pc => pc.close());
            Object.keys(peerConnections).forEach(key => delete peerConnections[key]);
            // 停止本地音訊串流
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
            }
            // 停止本地視訊
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

    useEffect(() => {
        console.log("[useVoice] activeVoiceChannelId changed:", activeVoiceChannelId);
    }, [activeVoiceChannelId]);

    useEffect(() => {
        console.log("[useVoice] voiceChannelMembers changed:", voiceChannelMembers);
    }, [voiceChannelMembers]);

    return {
        activeVoiceChannelId,
        voiceChannelMembers,
        joinVoiceChannel,
        leaveCurrentVoiceChannel,
        localStream: localStreamRef.current,
        remoteStreams, // 用 state 版本
        localVideoStream: localVideoStreamRef.current,
        remoteVideoStreams,
        isCameraOn,
        toggleCamera,
    };
};