import { useState, useEffect, useCallback } from 'react';
import type{ Message } from '../types/index.ts';
import { useWebSocket } from './useWebSocket';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [activeChannel, setActiveChannel] = useState<string>('chat1');

  const { sendMessage: wsSendMessage, myId, setTextMessageCallback, users: connectedUsers } = useWebSocket();

  // 處理收到的文字訊息的回呼函數
  const handleIncomingMessage = useCallback((msg: any) => {
    if (msg.type === 'text-message') {
      const sender = connectedUsers.find(u => u.id === msg.fromId);
      const newMessage: Message = {
        type: 'text-message',
        id: `${msg.fromId}-${msg.timestamp}`, // 使用 fromId 和 timestamp 組成唯一 ID
        text: msg.text,
        timestamp: new Date(msg.timestamp), // 將 ISO 字串轉換為 Date 物件
        channelId: msg.channelId,
        userId: msg.fromId,
        userName: sender ? sender.name : msg.fromId, // 如果能找到使用者，則用其名稱
      };
      setMessages(prev => [...prev, newMessage]);
    }
  }, [connectedUsers]); // connectedUsers 作為依賴項

    // 註冊和清理回呼函數
  useEffect(() => {
    if (setTextMessageCallback) { // 確保 setTextMessageCallback 存在
        setTextMessageCallback(handleIncomingMessage);
    }
    return () => {
      if (setTextMessageCallback) {
        setTextMessageCallback(null); // 清理
      }
    };
  }, [setTextMessageCallback, handleIncomingMessage]);

  const sendMessage = () => {
    if (input.trim() && myId) {
      const newMessage: Message = {
        type: 'text-message',
        id: Date.now().toString(),
        text: input,
        timestamp: new Date(),
        channelId: activeChannel
      };
      wsSendMessage && wsSendMessage(newMessage); // 呼叫 wsSendMessage 傳送訊息
      setMessages(prev => [...prev, newMessage]);
      setInput('');
    }
  };

  const switchChannel = (channelId: string) => {
    setActiveChannel(channelId);
    // 可以在這裡載入該頻道的訊息
  };

  return {
    messages: messages.filter(msg => msg.channelId === activeChannel),
    input,
    activeChannel,
    setInput,
    sendMessage,
    switchChannel
  };
};