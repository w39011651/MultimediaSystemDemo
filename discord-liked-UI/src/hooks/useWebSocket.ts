import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from '../types';
import { VOICE_EVENT_TYPES } from '../constant/events';

const isVoiceEventType = (type: string): boolean => {
    return Object.values(VOICE_EVENT_TYPES).includes(type as typeof VOICE_EVENT_TYPES[keyof typeof VOICE_EVENT_TYPES]);
};

function getServerUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
}

const SERVER_URL = getServerUrl();

export const useWebSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [myId, setMyId] = useState<string>('');
    const [users, setUsers] = useState<User[]>([]);
    const ws = useRef<WebSocket | null>(null);
    const textMessageCallbackRef = useRef<(message: any) => void | null>(null);
    const historyCallbackRef = useRef<(messages: any[]) => void | null>(null);
    const voiceMessageHandlerRef = useRef<(message: any) => void | null>(null);
    const messageBuffer = useRef<any[]>([]); // 新增訊息暫存
    const [voiceChannelMembers, setVoiceChannelMembers] = useState<Record<string, User[]>>({});

    useEffect(() => {
        // 連接 WebSocket
        ws.current = new WebSocket(SERVER_URL);
        console.log(SERVER_URL);
        ws.current.onopen = () => {
            console.log('已連上 signaling server');
            setIsConnected(true);
            // 連線一建立就送 get-history，預設頻道
            ws.current?.send(JSON.stringify({
                type: "get-history",
                channelId: "chat1" // 或 activeChannel 的預設值
            }));
        };

        ws.current.onmessage = (event) => {
            const msg = JSON.parse(event.data as string);
            console.log('收到訊息:', msg);
            
            if (msg.type === "welcome") {
                setMyId(msg.id);
                console.log('我的 ID:', msg.id, '現有用戶:', msg.userList);
                //console.log('[前端] welcome.voiceChannelMembers:', msg.voiceChannelMembers);
                
                // 將 userList 轉換為 User 物件
                const userObjects: User[] = msg.userList.map((userId: string) => ({
                    id: userId,
                    name: userId, // 暫時用 ID 當名稱
                    status: 'online' as 'online' | 'offline' | 'away'
                }));
                setUsers(userObjects);

                if (msg.voiceChannelMembers) {
                    // msg.voiceChannelMembers: { [channelId]: {id, name}[] }
                    const members: Record<string, User[]> = {};
                    Object.entries(msg.voiceChannelMembers).forEach(([cid, users]) => {
                        members[cid] = (users as any[]).map(u => ({
                            id: u.id,
                            name: u.name,
                            status: 'online'
                        }));
                    });
                    setVoiceChannelMembers(members);
                }
                
            } else if (msg.type === "user-joined") {
                // 新使用者加入
                const newUser: User = {
                    id: msg.id,
                    name: msg.id,
                    status: 'online' as 'online' | 'offline' | 'away'
                };
                setUsers(prev => {
                    if(prev.find(u => u.id === newUser.id))return prev;
                    return [...prev, newUser];
                });
                
                console.log('[useWebSocket] 新使用者加入 (全域):', msg.id);
                setUsers(prev => [...prev, newUser]);

                // 新增：呼叫文字訊息 callback，產生系統訊息
                if (textMessageCallbackRef.current) {
                    textMessageCallbackRef.current({
                        type: 'system-message',
                        text: msg.message,
                        timestamp: new Date().toISOString(),
                        //channelId: msg.channelId || 'chat1', // 根據你的頻道設計
                    });
                }

            } else if (msg.type === "user-left") {
                // 使用者離開
                setUsers(prev => prev.filter(user => user.id !== msg.id));
                console.log('[useWebSocket] 使用者離開:', msg.id);

                // 新增：呼叫文字訊息 callback，產生系統訊息
                if (textMessageCallbackRef.current) {
                    textMessageCallbackRef.current({
                        type: 'system-message',
                        text: msg.message,
                        timestamp: new Date().toISOString(),
                    });
                }
            
            } else if (msg.type === "text-message") {
                if (textMessageCallbackRef.current) {
                    console.log('[useWebSocket] Forwarding text message to textMessageCallbackRef');
                    textMessageCallbackRef.current(msg);
                } else {
                    // 暫存訊息
                    messageBuffer.current.push(msg);
                    console.warn('[useWebSocket] textMessageCallbackRef is null, message buffered:', msg);
                }
            } else if (isVoiceEventType(msg.type)) { // <--- 新增：判斷是否為語音事件
                if (voiceMessageHandlerRef.current) {
                    console.log(`[useWebSocket] Forwarding voice message (type: ${msg.type}) to voiceMessageHandlerRef`);
                    voiceMessageHandlerRef.current(msg);
                } else {
                    console.warn(`[useWebSocket] voiceMessageHandlerRef is null, cannot process voice message (type: ${msg.type}):`, msg);
                }
            } else if (msg.type === "history") {
                if (historyCallbackRef.current) {
                    historyCallbackRef.current(msg.messages);
                }
            } else if (msg.type === "VOICE_CHANNEL_MEMBERS_UPDATE") {
                const members: Record<string, User[]> = {};
                Object.entries(msg.voiceChannelMembers).forEach(([cid, users]) => {
                    members[cid] = (users as any[]).map(u => ({
                        id: u.id,
                        name: u.name,
                        status: 'online'
                    }));
                });
                setVoiceChannelMembers(members);
            } else {
                console.warn('[useWebSocket] 未處理的訊息類型:', msg.type, msg);
            }

        }; 

        ws.current.onclose = (event) => {
            console.log('WebSocket 連線關閉', event);
            setIsConnected(false);
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket 錯誤:', error);
        };

        // 清理函數
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    const sendMessage = useCallback((message: any) => { // 將 sendMessage 包在 useCallback 中
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        } else {
            console.error('[useWebSocket] WebSocket is not open. Cannot send message:', message);
        }
    }, []); // sendMessage 通常不需要依賴項，除非它內部使用了會變的狀態或 props

    // 註冊 callback 時，把暫存訊息全部處理掉
    const setTextMessageCallback = useCallback((callback: ((message: any) => void) | null) => {
        textMessageCallbackRef.current = callback;
        if (callback && messageBuffer.current.length > 0) {
            messageBuffer.current.forEach(msg => callback(msg));
            messageBuffer.current = [];
        }
    }, []);

    
    const setVoiceMessageHandler = useCallback((callback : ((message: any)=>void | null)) => {
        console.log('[useWebSocket] setVoiceMessageHandler called');
        voiceMessageHandlerRef.current = callback;
    }, []);

    // 讓其他 hook 註冊歷史訊息回呼
    const setHistoryCallback = (callback: ((messages: any[]) => void) | null) => {
        historyCallbackRef.current = callback;
    };

    return {
        isConnected,
        myId,
        users,
        sendMessage,
        setTextMessageCallback,
        setVoiceMessageHandler,
        setHistoryCallback,
        voiceChannelMembers,
        setVoiceChannelMembers,
    };
};