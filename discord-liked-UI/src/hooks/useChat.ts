import { useState, useEffect, useCallback } from 'react';
import type { Message } from '../types/index.ts';
import { useWebSocket } from './useWebSocket';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [activeChannel, setActiveChannel] = useState<string>('chat1');

  // 這裡要從 useWebSocket 取得 setHistoryCallback
  const { sendMessage: wsSendMessage, myId, setTextMessageCallback, setHistoryCallback, users: connectedUsers } = useWebSocket();

  // 處理收到的文字訊息的回呼函數
  const handleIncomingMessage = useCallback((msg: any) => {
    if (msg.type === 'text-message') {
      const sender = connectedUsers.find(u => u.id === msg.fromId);
      const newMessage: Message = {
        type: 'text-message',
        id: `${msg.fromId}-${msg.timestamp}`,
        text: msg.text,
        timestamp: new Date(msg.timestamp),
        channelId: msg.channelId,
        userId: msg.fromId,
        userName: sender ? sender.name : msg.fromId,
      };
      setMessages(prev => [...prev, newMessage]);
    }
  }, [connectedUsers]);

  // 註冊和清理文字訊息回呼
  useEffect(() => {
    if (setTextMessageCallback) {
      setTextMessageCallback(handleIncomingMessage);
    }
    return () => {
      if (setTextMessageCallback) {
        setTextMessageCallback(null);
      }
    };
  }, [setTextMessageCallback, handleIncomingMessage]);

  // 處理歷史訊息回呼
  useEffect(() => {
    if (setHistoryCallback) {
      setHistoryCallback((msgs: any[]) => {
        const historyMessages: Message[] = msgs.map(msg => ({
          type: 'text-message',
          id: `${msg.fromId}-${msg.timestamp}`,
          text: msg.text,
          timestamp: new Date(msg.timestamp),
          channelId: msg.channelId,
          userId: msg.fromId,
          userName: msg.fromId,
        }));
        setMessages(historyMessages);
      });
    }
    return () => {
      if (setHistoryCallback) setHistoryCallback(null);
    };
  }, [setHistoryCallback, activeChannel]);

  // 每次切換頻道時自動請求歷史訊息
  useEffect(() => {
    if (wsSendMessage && activeChannel) {
      wsSendMessage({ type: "get-history", channelId: activeChannel });
    }
  }, [wsSendMessage, activeChannel]);

  const sendMessage = () => {
    if (input.trim() && myId) {
      const newMessage: Message = {
        type: 'text-message',
        id: Date.now().toString(),
        text: input,
        timestamp: new Date(),
        channelId: activeChannel
      };
      wsSendMessage && wsSendMessage(newMessage);
      setMessages(prev => [...prev, newMessage]);
      setInput('');
    }
  };

  const switchChannel = (channelId: string) => {
    setActiveChannel(channelId);
    // 這裡不用再手動載入訊息，useEffect 會自動處理
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