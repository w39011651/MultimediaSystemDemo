import React from 'react';
import type {Channel, User} from '../../types/index.ts';
import { ChannelItem } from './ChannelItem';
import { useVoice } from '../../hooks/useVoice.ts';

interface ChannelListProps {
  textChannels: Channel[];
  voiceChannels: Channel[];
  activeChannel: string; // 新增
  switchChannel: (channelId: string) => void; // 新增
}

export const ChannelList: React.FC<ChannelListProps> = ({
  textChannels,
  voiceChannels,
  activeChannel,
  switchChannel,
}) => {
  const {
    activeVoiceChannelId,
    voiceChannelMembers,
    joinVoiceChannel,
    leaveCurrentVoiceChannel,
  } = useVoice();

// --- 模擬資料結束 ---
const handleChannelClick = (channelId: string, type: 'text' | 'voice') => {
  if (type === 'text') {
    switchChannel(channelId);
    // 如果使用者在語音頻道中，點擊文字頻道不應該自動離開語音頻道
    // 若要實作離開語音頻道，需明確呼叫 leaveCurrentVoiceChannel()
  } else if (type === 'voice') {
    // 之後會使用 useVoice 的 joinVoiceChannel
    joinVoiceChannel(channelId);
  }
};

  // DEBUG: Log voice state from useVoice
  console.log('[ChannelList] activeVoiceChannelId:', activeVoiceChannelId);
  console.log('[ChannelList] voiceChannelMembers:', voiceChannelMembers);

  // ... handleChannelClick ...

  return (
    <div style={{ width: '240px', background: '#1e1f22', padding: '16px', color: '#8e9297', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>Text Channels</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {textChannels.map(channel => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              isActive={channel.id === activeChannel}
              onClick={handleChannelClick}
            />
          ))}
        </ul>
      </div>
      <div>
        <h3 style={{ fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>Voice Channels</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {voiceChannels.map(channel => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              isActive={channel.id === activeVoiceChannelId}
              usersInChannel={channel.id === activeVoiceChannelId ? voiceChannelMembers[channel.id] : undefined}
              onClick={handleChannelClick}
            />
          ))}
        </ul>
      </div>
    </div>
  );
};