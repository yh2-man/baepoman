import React, { useState } from 'react';
import { useFriends } from '../../context/FriendsContext';
import './FriendCard.css';

const ContextMenu = ({ x, y, onClose, onRemove }) => {
    return (
        <div className="context-menu" style={{ top: y, left: x }} onClick={onClose}>
            <div className="context-menu-item" onClick={onRemove}>
                친구 삭제
            </div>
        </div>
    );
};

const FriendCard = ({ friend, isPending = false }) => {
    const {
        acceptFriendRequest,
        declineFriendRequest,
        removeFriend,
        unreadMessages,
        setActiveConversation,
        markMessagesAsRead,
    } = useFriends();

    const [contextMenu, setContextMenu] = useState(null);

    const unreadCount = unreadMessages[friend.id] || 0;

    const handleContextMenu = (e) => {
        e.preventDefault();
        if (isPending) return; // No context menu for pending requests
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const closeContextMenu = () => {
        setContextMenu(null);
    };

    const handleRemoveFriend = () => {
        removeFriend(friend.id);
        closeContextMenu();
    };

    const handleCardClick = () => {
        if (isPending) return;
        setActiveConversation(friend.id); // This will open the DM panel
        markMessagesAsRead(friend.id);
    };

    const avatarUrl = friend.profile_image_url
        ? `http://localhost:3001${friend.profile_image_url}`
        : null;

    return (
        <div className="friend-card" onClick={handleCardClick} onContextMenu={handleContextMenu}>
            <div className="friend-avatar">
                {avatarUrl ? (
                    <img src={avatarUrl} alt={friend.username} className="friend-avatar-img" />
                ) : (
                    <div className="avatar-placeholder">{friend.username.charAt(0)}</div>
                )}
            </div>
            <div className="friend-info">
                <span className="friend-name">{friend.username}</span>
                <span className="friend-tag">#{friend.tag}</span>
            </div>
            {unreadCount > 0 && <div className="unread-badge">{unreadCount}</div>}
            {isPending && (
                <div className="friend-actions">
                    <button className="action-btn accept" onClick={() => acceptFriendRequest(friend.id)}>✓</button>
                    <button className="action-btn decline" onClick={() => declineFriendRequest(friend.id)}>×</button>
                </div>
            )}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={closeContextMenu}
                    onRemove={handleRemoveFriend}
                />
            )}
        </div>
    );
};

export default FriendCard;