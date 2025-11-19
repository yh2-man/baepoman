import React, { useEffect, useRef } from 'react';
import ProfileAvatar from '../common/ProfileAvatar';
import './InviteFriendModal.css';

const InviteFriendModal = ({ isOpen, friends, onClose, onInviteFriend, position }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div
      ref={modalRef}
      className="invite-friend-modal-content"
      style={{
        bottom: position.bottom ? `${position.bottom}px` : 'auto',
        left: position.left ? `${position.left}px` : 'auto',
      }}
    >
      <h3>친구 초대</h3>
      <div className="friend-list-container">
        {friends.length === 0 ? (
          <p>초대할 친구가 없습니다.</p>
        ) : (
          <ul>
            {friends.map((friend) => (
              <li key={friend.id} className="friend-list-item" onClick={() => onInviteFriend(friend)}>
                <ProfileAvatar user={friend} size="small" />
                <span className="friend-name">{friend.username}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default InviteFriendModal;
