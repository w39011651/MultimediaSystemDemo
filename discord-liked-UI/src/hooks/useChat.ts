import { useState, useEffect, useCallback } from 'react';
import type { Message, User } from '../types/index.ts';
import { useWebSocketContext } from './WebSocketProvider';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [activeChannel, setActiveChannel] = useState<string>('chat1');

  //// 這裡要從 useWebSocket 取得 setHistoryCallback
  //const { sendMessage: wsSendMessage, myId, setTextMessageCallback, setHistoryCallback, users: connectedUsers } = useWebSocket();

  // 這裡改成用 context
  const { isConnected, sendMessage: wsSendMessage, myId, setTextMessageCallback, setHistoryCallback, users: connectedUsers } = useWebSocketContext() as {
    isConnected: boolean,
    sendMessage: any,
    myId: string,
    setTextMessageCallback: any,
    setHistoryCallback: any,
    users: User[]
  };

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
    } else if (msg.type === 'system-message') {
      const textChannels = ['chat1', 'chat2', 'chat3'];
      const newMessages: Message[] = textChannels.map(channelId => ({
        type: 'system-message',
        id: `system-${Date.now()}`,
        text: msg.text,
        timestamp: new Date(msg.timestamp),
        channelId,
        userId: 'system',
        userName: 'System',
      }));
      setMessages(prev => [...prev, ...newMessages]);
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
        setMessages(prev => {
          // 避免重複，保留 system-message
          console.log('[useChat] 接收到歷史訊息', msgs, activeChannel);
          const systemMessages = prev.filter(m => m.type === 'system-message' && m.channelId === activeChannel);
          return [...historyMessages, ...systemMessages];
        });
      });
    }
    return () => {
      if (setHistoryCallback) setHistoryCallback(null);
    };
  }, [setHistoryCallback, activeChannel]);

  // 每次切換頻道時自動請求歷史訊息
  useEffect(() => {
    if (isConnected && wsSendMessage && activeChannel) {
      console.log('[useChat] 發送 get-history', activeChannel);
      wsSendMessage({ type: "get-history", channelId: activeChannel });
    }
  }, [isConnected, wsSendMessage, activeChannel]);

  const sendMessage = () => {
    if (input.trim() && myId) {
      const newMessage: Message = {
        type: 'text-message',
        id: Date.now().toString(),
        text: input,
        timestamp: new Date(),
        channelId: activeChannel,
        userId: myId,
        userName: myId,
      };
      wsSendMessage && wsSendMessage(newMessage);
      //setMessages(prev => [...prev, newMessage]);
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