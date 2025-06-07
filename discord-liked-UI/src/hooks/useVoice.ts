import { VOICE_EVENT_TYPES } from "../constant/events";
import { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import type { User } from '../types';

export const useVoice = () => {
    const { myId, sendMessage, setVoiceMessageHandler } = useWebSocket();
    const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null);
    const [voiceChannelMembers, setVoiceChannelMembers] = useState<Record<string, User[]>>({}); // { channelId: [User, User, ...] }

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
                    setVoiceChannelMembers(prev => {
                        const newState = { ...prev, [msg.channelId]: users };
                        console.log("[useVoice] VOICE_CHANNEL_STATUS: New voiceChannelMembers state (inside setter):", newState);
                        return newState;
                    });
                    console.log(`[useVoice] Setting activeVoiceChannelId: ${msg.channelId}`); // DEBUG
                    if (activeVoiceChannelId !== msg.channelId) {
                         console.log(`[useVoice] VOICE_CHANNEL_STATUS: Updating activeVoiceChannelId from ${activeVoiceChannelId} to ${msg.channelId} based on server confirmation.`);
                         setActiveVoiceChannelId(msg.channelId);
                    }
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
                    setVoiceChannelMembers(prev => {
                        console.log(`[useVoice] VOICE_USER_JOINED: prev state for channel ${msg.channelId}:`, prev[msg.channelId]); // 新增日誌
                        const currentChannelUsers = prev[msg.channelId] || [];
                        // 避免重複添加同一使用者
                        if (currentChannelUsers.find(u => u.id === newUser.id)) {
                            console.log(`[useVoice] VOICE_USER_JOINED: User ${newUser.id} already in channel ${msg.channelId}. Skipping.`);
                            return prev; // 使用者已存在，不更新
                        }
                        const updatedUsers = [...currentChannelUsers, newUser];
                        const newState = { ...prev, [msg.channelId]: updatedUsers };
                        console.log("[useVoice] VOICE_USER_JOINED: New voiceChannelMembers state (inside setter):", newState);
                        return newState;
                    });
                } else {
                    console.warn("[useVoice] VOICE_CHANNEL_STATUS: Missing channelId or users in message:", msg);
                }
                break;
            case VOICE_EVENT_TYPES.VOICE_USER_LEFT: // 其他使用者離開目前所在的語音頻道
                if (msg.channelId && msg.userId) {
                    console.log(`[useVoice] VOICE_USER_LEFT: User ${msg.userId} left channel ${msg.channelId}`);
                    setVoiceChannelMembers(prev => {
                        const currentChannelUsers = prev[msg.channelId] || [];
                        const updatedUsers = currentChannelUsers.filter(u => u.id !== msg.userId);
                        const newState = { ...prev, [msg.channelId]: updatedUsers };
                        console.log("[useVoice] VOICE_USER_LEFT: New voiceChannelMembers state (inside setter):", newState);
                        return newState;
                    });
                    if (msg.userId === myId && msg.channelId === activeVoiceChannelId) {
                        console.log(`[useVoice] VOICE_USER_LEFT: Current user left active channel. Setting activeVoiceChannelId to null.`);
                        setActiveVoiceChannelId(null);
                    }
                } else {
                    console.warn("[useVoice] VOICE_USER_LEFT: Missing channelId or userId in message:", msg);
                }
                break;
            default:
                console.warn('[useVoice] Unhandled voice message type:', msg.type);
        }
    }, [myId, activeVoiceChannelId, setActiveVoiceChannelId, setVoiceChannelMembers]);

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

        // 如果已在其他語音頻道，先發送離開訊息
        if (activeVoiceChannelId && sendMessage) {
            sendMessage({
                type: VOICE_EVENT_TYPES.LEAVE_VOICE, // 使用 VOICE_EVENT_TYPES.LEAVE_VOICE
                payload: { channelId: activeVoiceChannelId },
            });
            // 可以選擇性地在這裡清除舊頻道的成員列表，或等待伺服器確認
            // 樂觀地清除舊頻道的成員，或者等待伺服器確認
            setVoiceChannelMembers(prev => {
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

    const leaveCurrentVoiceChannel = useCallback(() => {
        if (activeVoiceChannelId && sendMessage) {
            sendMessage({
                type: 'leave-voice', // 使用 VOICE_EVENT_TYPES.LEAVE_VOICE
                payload: { channelId: activeVoiceChannelId },
            });
            setActiveVoiceChannelId(null); // 樂觀更新
            setVoiceChannelMembers(prev => { // 清理該頻道的成員
                const newState = {...prev};
                delete newState[activeVoiceChannelId];
                return newState;
            });
        }
    }, [activeVoiceChannelId, sendMessage, setActiveVoiceChannelId, setActiveVoiceChannelId, setVoiceChannelMembers]);

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
    };
};