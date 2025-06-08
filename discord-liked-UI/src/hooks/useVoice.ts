// import { VOICE_EVENT_TYPES } from "../constant/events"; // 如果不再直接使用事件類型字串，可以移除
import { useCallback, useEffect } from 'react'; // useState 不再需要
// import { useWebSocketContext } from "./WebSocketProvider"; // 移除
// import type { User } from '../types'; // User 類型現在由 store 內部處理或從 store 狀態中獲取

import { useWebSocketStore } from '../store/websocketStore'; // 匯入 store
import { shallow } from 'zustand/shallow';
const EMPTY_OBJECT = {};
export const useVoice = () => {
    console.log('[useVoice] Hook execution started');
    // const
    // {
    //     activeVoiceChannelId: storeActiveVoiceChannelId,
    //     voiceChannelMembers: storeVoiceChannelMembers,
    //     joinVoiceChannel: storeJoinVoiceChannel,
    //     leaveCurrentVoiceChannel: storeLeaveCurrentVoiceChannel,
    // } = useWebSocketStore( state => ({
    //     activeVoiceChannelId: state.activeVoiceChannelId,
    //     voiceChannelMembers: state.voiceChannelMembers,
    //     joinVoiceChannel: state.joinVoiceChannel,
    //     leaveCurrentVoiceChannel: state.leaveCurrentVoiceChannel,
    // }), shallow);
    const activeVoiceChannelId = 'chat1'; // 或者一個固定的頻道 ID，如 'voice1'
    const voiceChannelMembers = EMPTY_OBJECT; // 靜態空物件

    const joinVoiceChannel = useCallback( (channelId: string) => 
    {
        console.log('[useVoice] joinVoiceChannel called with:', channelId);
        // if (channelId === activeVoiceChannelId)
        // {
        //     console.log(`[useVoice] Already in voice channel: ${channelId}`);
        //     return;
        // }
        // console.log('[useVoice] Trigger joinVoiceChannel.');
        // storeJoinVoiceChannel(channelId);
    }, [/*activeVoiceChannelId, storeJoinVoiceChannel*/]);

    const leaveCurrentVoiceChannel = useCallback(() => 
    {
        console.log('[useVoice] leaveCurrentVoiceChannel called');
        // if (!activeVoiceChannelId) {
        //     console.log(`[useVoice] Not in any voice channel to leave.`);
        //     return;
        // }
        // storeLeaveCurrentVoiceChannel();
    }, [/*activeVoiceChannelId, storeLeaveCurrentVoiceChannel*/]);


    // 用於調試的 useEffect 可以保留，但它們現在監聽 store 的變化
    useEffect(() => 
    {
        console.log("[useVoice Hook] activeVoiceChannelId (from store) changed:", activeVoiceChannelId);
    }, [activeVoiceChannelId]);

    useEffect(() => 
    {
        console.log("[useVoice Hook] voiceChannelMembers (from store) changed:", voiceChannelMembers);
    }, [voiceChannelMembers]);

    console.log('[useVoice] Returning values:', { activeVoiceChannelId, voiceChannelMembers });
    return {
        activeVoiceChannelId,
        voiceChannelMembers,
        joinVoiceChannel,
        leaveCurrentVoiceChannel,
    };
};