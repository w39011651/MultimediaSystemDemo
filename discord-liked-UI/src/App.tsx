import { MainLayout } from './components/Layout/MainLayout';
import { useChat } from './hooks/useChat';
import type { Channel } from './types';
import './App.css';
import { text } from 'stream/consumers';

function App() {
  const chatHook = useChat();
  const allChannels: Channel[] = [
    { id: 'chat1', name: 'Chat 1', type: 'text' },
    { id: 'chat2', name: 'Chat 2', type: 'text' },
    { id: 'chat3', name: 'Chat 3', type: 'text' },
    { id: 'voice1', name: 'Voice 1', type: 'voice' },
    { id: 'voice2', name: 'Voice 2', type: 'voice' },
  ];
  // 模擬頻道資料
  const textChannels: Channel[] = allChannels.filter(ch => ch.type === 'text');
  const voiceChannels: Channel[] = allChannels.filter(ch => ch.type === 'voice');
  

  return <MainLayout {...chatHook} textChannels={textChannels} voiceChannels={voiceChannels} />;
}

export default App;