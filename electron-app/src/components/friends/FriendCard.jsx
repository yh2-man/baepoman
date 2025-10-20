import React, { useEffect } from 'react';
import { useProfiles } from '../../context/ProfileContext';
import './FriendCard.css';

const FriendCard = ({ friend }) => {
  const { profiles, getProfile } = useProfiles();
  const profile = profiles[friend.id];

  useEffect(() => {
    if (friend.id) {
      getProfile(friend.id);
    }
  }, [friend.id, getProfile]);

  const statusClass = `status-dot ${friend.status.toLowerCase()}`;

  const avatarUrl = profile?.profile_image_url 
    ? `http://localhost:3001${profile.profile_image_url}` 
    : null;

  return (
    <div className="friend-card">
      <div className="friend-avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt={friend.name} className="friend-avatar-img" />
        ) : (
          friend.name.charAt(0)
        )}
      </div>
      <div className="friend-info">
        <span className="friend-name">{friend.name}</span>
        <div className="friend-status">
          <span className={statusClass}></span>
          <span>{friend.status}</span>
        </div>
      </div>
    </div>
  );
};

export default FriendCard;