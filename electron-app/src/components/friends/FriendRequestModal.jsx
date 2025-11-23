import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types'; // Import PropTypes
import { useFriends } from '../../context/FriendsContext';
import Button from '../common/Button';
import ProfileAvatar from '../common/ProfileAvatar';
import './FriendRequestModal.css';

const FriendRequestModal = ({ isOpen, onClose }) => {
  const { pendingRequests, acceptFriendRequest, declineFriendRequest } = useFriends();
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={popoverRef} className={`friend-request-popover ${isOpen ? 'visible' : ''}`}>
      <h2>친구 요청</h2>
      {pendingRequests.incoming.length === 0 ? (
        <p>받은 친구 요청이 없습니다.</p>
      ) : (
        <div className="friend-request-list">
          {pendingRequests.incoming.map(request => (
            <div key={request.id} className="friend-request-item">
              <ProfileAvatar user={request} />
              <div className="friend-info">
                <span className="friend-name">{request.username}</span>
                <span className="friend-tag">#{request.tag}</span>
              </div>
              <div className="request-actions">
                                                                                        <Button onClick={() => acceptFriendRequest(request.id)} backgroundColor="#4CAF50" textColor="white" circular={true}>&#10003;</Button>
                  <Button onClick={() => declineFriendRequest(request.id)} backgroundColor="var(--error-color)" textColor="white" circular={true}>&#10006;</Button>
            </div>
            </div> // Closes friend-request-item div
          ))}
        </div>
      )}
    </div>
  );
};

FriendRequestModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FriendRequestModal;