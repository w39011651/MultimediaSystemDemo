import React, { useCallback } from 'react';
import type {Channel, User} from '../../types/index.ts';
import { ChannelItem } from './ChannelItem';
import { useVoice } from '../../hooks/useVoice.ts';

interface ChannelListProps {
  textChannels: Channel[];
  voiceChannels: Channel[];
  activeChannel: string; // 新增
  switchChannel: (channelId: string) => void; // 新增
}
const MinimalChannelItem = ({ channelName }: { channelName: string }) => {
  console.log(`[MinimalChannelItem] Rendering ${channelName}`);
  return <li style={{ padding: '4px 0', cursor: 'pointer' }}># {channelName} (Minimal)</li>;
};
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
  const handleChannelClick = useCallback((channelId: string, type: 'text' | 'voice') => {
    console.log(`[ChannelList] STUB handleChannelClick: ${channelId}, type: ${type}. ActiveText: ${activeChannel}, ActiveVoice: ${activeVoiceChannelId}`);
    // if (type === 'text') {
    //   switchChannel(channelId);
    // } else if (type === 'voice') {
    //   joinVoiceChannel(channelId);
    // }
  }, []); // 依賴項是從 props 和 useVoice 獲取的穩定函式

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
            // <ChannelItem
            //   key={channel.id}
            //   channel={channel}
            //   isActive={channel.id === activeChannel}
            //   onClick={handleChannelClick}
            // />
            <MinimalChannelItem key={channel.id} channelName={channel.name} />
          ))}
        </ul>
      </div>
      <div>
        <h3 style={{ fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>Voice Channels</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {voiceChannels.map(channel => (
            // <ChannelItem
            //   key={channel.id}
            //   channel={channel}
            //   isActive={channel.id === activeVoiceChannelId}
            //   usersInChannel={voiceChannelMembers[channel.id]}
            //   onClick={handleChannelClick}
            // />
             <MinimalChannelItem key={channel.id} channelName={channel.name} />
          ))}
        </ul>
      </div>
    </div>
  );
};