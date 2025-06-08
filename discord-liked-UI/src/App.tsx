import { MainLayout } from './components/Layout/MainLayout';
import { useChat } from './hooks/useChat';
//import { WebSocketProvider } from './hooks/WebSocketProvider';
import type { Channel } from './types';
import './App.css';
import { useWebSocketStore } from './store/websocketStore';
import { useEffect } from 'react';
import { shallow } from 'zustand/shallow';
//import { text } from 'stream/consumers';

function AppContent() {
  console.log('[AppContent] Component execution started'); // <--- 新增日誌
  //const chatHook = useChat();
  const connectWebSocket = useWebSocketStore((state) => state.connect, shallow);
  const disconnectWebSocket = useWebSocketStore((state) => state.disconnect, shallow);

  // 在 App 元件掛載時連接 WebSocket，卸載時斷開
  useEffect(() => {
    connectWebSocket();
    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]); // 依賴項確保 connect/disconnect 函數穩定

  const chatHook = useChat();

  const textChannels = useWebSocketStore((state) => state.textChannels, shallow);
  const voiceChannels = useWebSocketStore((state) => state.voiceChannels, shallow);
  // DEBUGGING: Log channel array references
  console.log('[AppContent] textChannels reference:', textChannels === (window as any).lastTextChannels);
  (window as any).lastTextChannels = textChannels;
  console.log('[AppContent] voiceChannels reference:', voiceChannels === (window as any).lastVoiceChannels);
  (window as any).lastVoiceChannels = voiceChannels;
  // 如果 chatHook.activeChannel 可能為 null，而 MainLayout 需要 string，則提供預設值
  const activeChannelId = chatHook.activeChannel || (textChannels.length > 0 ? textChannels[0].id : '');
  console.log('[AppContent] activeChannelId VALUE:', activeChannelId); // <--- 確認這個值
  console.log('[AppContent] switchChannel reference:', chatHook.switchChannel === (window as any).lastSwitchChannel);
  return (
    <MainLayout
      messages={chatHook.messages}
      input={chatHook.input}
      setInput={chatHook.setInput}
      sendMessage={chatHook.sendMessage}
      activeChannel={activeChannelId} // 使用從 chatHook 或 store 獲取的 activeChannel
      switchChannel={chatHook.switchChannel} // 確保 useChat 返回 switchChannel
      textChannels={textChannels} // 從 store 獲取
      voiceChannels={voiceChannels} // 從 store 獲取
      // 如果 MainLayout 需要 myId 或 users，也應從 store 或相應的 hook 獲取
      // myId={useWebSocketStore(state => state.myId)}
      // users={useWebSocketStore(state => state.users)}
    />
  );
}

function App() {
  return (
    //<WebSocketProvider>
      <AppContent />
    //</WebSocketProvider>
  );
}

export default App;