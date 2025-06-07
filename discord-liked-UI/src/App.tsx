import { MainLayout } from './components/Layout/MainLayout';
import { useChat } from './hooks/useChat';
import type { Channel } from './types';
import './App.css';

function App() {
  const chatHook = useChat();
  
  // 模擬頻道資料
  const channels: Channel[] = [
    { id: 'chat1', name: 'Chat 1', type: 'text' },
    { id: 'chat2', name: 'Chat 2', type: 'text' },
    { id: 'chat3', name: 'Chat 3', type: 'text' },
    { id: 'voice1', name: 'Voice 1', type: 'voice' },
    { id: 'voice2', name: 'Voice 2', type: 'voice' },
  ];

  return <MainLayout {...chatHook} channels={channels} />;
}

export default App;