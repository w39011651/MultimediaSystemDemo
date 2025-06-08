import { useState, useCallback, useMemo } from 'react'; // useEffect 可能不再需要，useCallback 可能還需要用於 sendMessage
// import type { Message, User } from '../types/index.ts'; // Message 類型可能仍需要，User 可能由 store 處理
// import { useWebSocketContext } from './WebSocketProvider'; // 移除
import { useWebSocketStore } from '../store/websocketStore'; // 匯入 store
import { shallow } from 'zustand/shallow';

export const useChat = () => {
  // const [messages, setMessages] = useState<Message[]>([]); // 移除，從 store 獲取
  const [input, setInput] = useState('');
  // const [activeChannel, setActiveChannel] = useState<string>('chat1'); // 移除，從 store 獲取

  // 從 store 中選取需要的狀態和 actions
  // const {
  //   myId,
  //   activeTextChannelId,
  //   messagesByChannel,
  //   sendMessage: storeSendMessage, // 重新命名以避免與本地函式衝突
  //   setActiveTextChannel, // store 中的 action
  //   // users // 如果需要全域使用者列表，可以從 store 獲取
  // } = useWebSocketStore(state => ({
  //   myId: state.myId,
  //   activeTextChannelId: state.activeTextChannelId,
  //   messagesByChannel: state.messagesByChannel,
  //   sendMessage: state.sendMessage,
  //   setActiveTextChannel: state.setActiveTextChannel,
  //   // users: state.users,
  // }), shallow);
  const myId = 'test-user-id';
  const activeTextChannelId = 'chat1';
  // 取得目前活動文字頻道的訊息
  // 如果 activeTextChannelId 是 null (例如初始狀態)，則 currentChannelMessages 會是空陣列
  //   const currentChannelMessages = useMemo(() => {
  //   return activeTextChannelId ? (messagesByChannel[activeTextChannelId] || []) : [];
  // }, [activeTextChannelId, messagesByChannel]); // <--- 依賴項
  const currentChannelMessages = [];

  // 移除 handleIncomingMessage 和相關的 useEffect，store 的 _handleMessage 會處理
  // 移除處理歷史訊息的 useEffect，store 的 setActiveTextChannel 和 _handleMessage 會處理
  // 移除每次切換頻道時自動請求歷史訊息的 useEffect，store 的 setActiveTextChannel 會處理

  const sendMessage = useCallback(() => {
    console.log('[useChat] sendMessage called with input:', input);
    // if (input.trim() && myId && activeTextChannelId) {
    //   // 訊息的結構應符合伺服器期望，store 的 sendMessage 會將其 JSON.stringify
    //   // type, fromId, timestamp 等欄位通常由伺服器處理或在 store 的 _handleMessage 中構建
    //   // 客戶端主要發送意圖和內容
    //   const messagePayload = {
    //     type: 'text-message', // 確保這個 type 是伺服器能識別的
    //     text: input,
    //     channelId: activeTextChannelId,
    //     // fromId: myId, // 通常伺服器會根據連線識別發送者
    //     // timestamp: new Date().toISOString(), // 通常伺服器會記錄時間戳
    //   };
    //   storeSendMessage(messagePayload);
    //   // 不再需要樂觀更新 setMessages，store 會在收到伺服器訊息後更新 messagesByChannel
    //   setInput('');
    // }
  }, [input, myId, activeTextChannelId, /*storeSendMessage*/]);

  const switchChannel = useCallback((channelId: string) => {
    console.log('[useChat] switchChannel called with channelId:', channelId);
    // // setActiveChannel(channelId); // 移除本地狀態更新
    // setActiveTextChannel(channelId); // 呼叫 store action
    // // store 的 setActiveTextChannel action 會負責請求歷史訊息 (如果需要)
  }, [/*setActiveTextChannel*/]);

  return {
    // messages: messages.filter(msg => msg.channelId === activeChannel), // 改為從 store 獲取的 currentChannelMessages
    messages: currentChannelMessages,
    input,
    activeChannel: activeTextChannelId || '', // 從 store 獲取，提供預設值以避免 null
    setInput,
    sendMessage,
    switchChannel,
  };
};