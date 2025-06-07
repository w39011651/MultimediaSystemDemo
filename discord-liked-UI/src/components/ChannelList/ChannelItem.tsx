// Import or define the Channel type
import type { Channel, User} from '../../types/index.ts'; // Adjust the path as needed

interface ChannelItemProps {
  channel: Channel;
  isActive: boolean; // 對於文字頻道：目前聊天頻道。對於語音頻道：使用者在此頻道中。
  usersInChannel?: User[]; // 如果這是活動的語音頻道，則為使用者列表
  onClick: (channelId: string, type: 'text' | 'voice') => void; // 更新 onClick 以包含類型
}

export const ChannelItem: React.FC<ChannelItemProps> = ({
    channel,
    isActive,
    usersInChannel,
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

    const userItemStyle: React.CSSProperties = {
        padding: '4px 12px 4px 24px', // 縮排使用者項目
        color: '#b9bbbe',
        fontSize: '0.9em',
        listStyle: 'none',
        marginLeft: '10px', // 為使用者列表添加一些左邊距
        display: 'flex',
        alignItems: 'center'
    };

    const userIconStyle: React.CSSProperties = {
        marginRight: '8px', // 圖標和文字之間的間距
        // 可以根據圖標類型調整樣式，例如 emoji 大小
    };

    return (
    <>
        <li
            style={getChannelStyle()}
            onClick={() => onClick(channel.id, channel.type)}
            onMouseEnter={(e) => {
                if ((!isActive && channel.type === 'text') || (isActive && channel.type === 'voice')) {
                    e.currentTarget.style.backgroundColor = '#40444b';
                }
            }}
            onMouseLeave={(e) => {
                if ((!isActive && channel.type === 'text') || (isActive && channel.type === 'voice') ) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }
            }}
            >
            {channel.type === 'text' ? '#' : '🔊'} {channel.name}
        </li>
        {channel.type === 'voice' && isActive && usersInChannel && usersInChannel.length > 0 && (
            <ul style={{ padding: 0, margin: '0 0 5px 0' }}> {/* 移除 ul 的預設 padding */}
                {usersInChannel.map(user => (
                    <li key={user.id} style={userItemStyle}>
                        <span style={userIconStyle}>👤</span> {/* 簡單的用戶圖標 Emoji */}
                        {user.name}
                    </li>
                ))}
            </ul>
        )}
    </>
    
    )
}