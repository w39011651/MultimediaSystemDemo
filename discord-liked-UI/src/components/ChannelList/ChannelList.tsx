import { ChannelItem } from './ChannelItem';
import type { Channel } from '../../types';

interface ChannelListProps {
  channels: Channel[];
  activeChannel: string;
  onChannelClick: (channelId: string) => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  activeChannel,
  onChannelClick
}) => {
  const textChannels = channels.filter(ch => ch.type === 'text');
  const voiceChannels = channels.filter(ch => ch.type === 'voice');

  return (
    <div style={{ width: '33%', background: '#1d1d1e', color: '#fff', padding: '16px' }}>
      <h3>Text Channels</h3>
      <ul style={{ padding: 0 }}>
        {textChannels.map(channel => (
          <ChannelItem
            key={channel.id}
            channel={channel}
            isActive={activeChannel === channel.id}
            onClick={onChannelClick}
          />
        ))}
      </ul>
      
      <h3>Voice Channels</h3>
      <ul style={{ padding: 0 }}>
        {voiceChannels.map(channel => (
          <ChannelItem
            key={channel.id}
            channel={channel}
            isActive={activeChannel === channel.id}
            onClick={onChannelClick}
          />
        ))}
      </ul>
    </div>
  );
};