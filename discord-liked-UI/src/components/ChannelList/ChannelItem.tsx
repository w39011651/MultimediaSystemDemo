// Import or define the Channel type
import type { Channel } from '../../types/index.ts'; // Adjust the path as needed

interface ChannelItemProps
{
    channel: Channel;
    isActive: boolean;
    onClick: (channelId: string) => void;
}

export const ChannelItem: React.FC<ChannelItemProps> = ({
    channel,
    isActive,
    onClick
}) => {
    const getChannelStyle = () => ({
        padding: '8px 12px',
        margin: '4px 0',
        cursor: 'pointer',
        borderRadius: '4px',
        backgroundColor: isActive ? '#5865f2' : 'transparent',
        color: isActive ? '#fff' : '#b9bbbe',
        transition: 'all 0.2s ease',
        listStyle: 'none'
    });

    return (
        <li
            style={getChannelStyle()}
            onClick={() => onClick(channel.id)}
            onMouseEnter={(e) => {
                if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#40444b';
                }
            }}
            onMouseLeave={(e) => {
                if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }
            }}
            >
            {channel.type === 'text' ? '#' : '🔊'} {channel.name}
        </li>
    )
}