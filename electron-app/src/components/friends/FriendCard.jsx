import React, { useState, useEffect, useRef } from 'react';
import { useFriends } from '../../context/FriendsContext';
import ProfileAvatar from '../common/ProfileAvatar'; // Import the new component
import './FriendCard.css';

const ContextMenu = React.forwardRef(({ x, y, onClose, onRemove }, ref) => {
    return (
        <div className="context-menu" style={{ top: y, left: x }} onClick={onClose} ref={ref}>
            <div className="context-menu-item" onClick={onRemove}>
                친구 삭제
            </div>
        </div>
    );
});

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
    const menuRef = useRef(null);

    const unreadCount = unreadMessages[friend.id] || 0;

    const handleContextMenu = (e) => {
        e.preventDefault();
        if (isPending) return; // No context menu for pending requests
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const closeContextMenu = () => {
        setContextMenu(null);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                closeContextMenu();
            }
        };

        if (contextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [contextMenu]);


    const handleRemoveFriend = () => {
        removeFriend(friend.id);
        closeContextMenu();
    };

    const handleCardClick = () => {
        if (isPending) return;
        setActiveConversation(friend.id); // This will open the DM panel
        markMessagesAsRead(friend.id);
    };

    return (
        <div className="friend-card" onClick={handleCardClick} onContextMenu={handleContextMenu}>
            <ProfileAvatar user={friend} size="small" />
            <div className="friend-info">
                <span className="friend-name">{friend.username}</span>
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
                    ref={menuRef}
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