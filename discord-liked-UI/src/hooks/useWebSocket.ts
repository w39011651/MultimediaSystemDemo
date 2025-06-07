import { useState, useEffect, useRef } from 'react';
import type { User } from '../types';

export const useWebSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [myId, setMyId] = useState<string>('');
    const [users, setUsers] = useState<User[]>([]);
    const ws = useRef<WebSocket | null>(null);
    const textMessageCallbackRef = useRef<(message: any) => void | null>(null);
    const historyCallbackRef = useRef<(messages: any[]) => void | null>(null);

    useEffect(() => {
        // 連接 WebSocket
        ws.current = new WebSocket('ws://localhost:8080');
        
        ws.current.onopen = () => {
            console.log('已連上 signaling server');
            setIsConnected(true);
        };

        ws.current.onmessage = (event) => {
            const msg = JSON.parse(event.data as string);
            console.log('收到訊息:', msg);
            
            if (msg.type === "welcome") {
                setMyId(msg.id);
                console.log('我的 ID:', msg.id, '現有用戶:', msg.userList);
                
                // 將 userList 轉換為 User 物件
                const userObjects: User[] = msg.userList.map((userId: string) => ({
                    id: userId,
                    name: userId, // 暫時用 ID 當名稱
                    status: 'online' as 'online' | 'offline' | 'away'
                }));
                setUsers(userObjects);
                
            } else if (msg.type === "user-joined") {
                // 新使用者加入
                const newUser: User = {
                    id: msg.id,
                    name: msg.id,
                    status: 'online' as 'online' | 'offline' | 'away'
                };
                setUsers(prev => [...prev, newUser]);
                console.log('新使用者加入:', msg.id);
            } else if (msg.type === "text-message") {
                if (textMessageCallbackRef.current) {
                    textMessageCallbackRef.current(msg);
                }
            } else if (msg.type === "history") {
                if (historyCallbackRef.current) {
                    historyCallbackRef.current(msg.messages);
                }
            }
        };

        ws.current.onclose = () => {
            console.log('WebSocket 連線關閉');
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

    const sendMessage = (message: any) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        }
    };

    // 讓其他 hook 註冊文字訊息回呼
    const setTextMessageCallback = (callback: ((message: any) => void) | null) => {
        textMessageCallbackRef.current = callback;
    };

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
        setHistoryCallback
    };
};