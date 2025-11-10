import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../context/FriendsContext';
import Input from '../common/Input';
import Button from '../common/Button';
import FriendCard from './FriendCard';
import AddFriendModal from './AddFriendModal';
import './FriendsPanel.css';

// MyProfileCard component to clearly separate logic
const MyProfileCard = () => {
  const { user } = useAuth();

  if (!user) return null;

  const avatarUrl = (typeof user.profile_image_url === 'string' && user.profile_image_url)
    ? `http://localhost:8080${user.profile_image_url}` // Port updated to 8080
    : null;

  return (
    <div className="friend-card">
      <div className="friend-avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt={user.username} className="friend-avatar-img" />
        ) : (
          <div className="avatar-placeholder">{user.username.charAt(0)}</div>
        )}
      </div>
      <div className="friend-info">
        <span className="friend-name">{user.username}</span>
        <span className="friend-tag">#{user.tag}</span>
      </div>
    </div>
  );
};

const FriendsPanel = () => {
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { friends, pendingRequests } = useFriends();

  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <aside className="friends-panel">
      <div className="my-profile-section">
        <MyProfileCard />
      </div>

      <div className="friends-list-section custom-scrollbar">
        {/* Pending Requests Section */}
        {pendingRequests.incoming.length > 0 && (
          <div className="friends-list-group">
            <h5 className="friends-list-heading">보류 중인 요청 — {pendingRequests.incoming.length}</h5>
            {pendingRequests.incoming.map(request => (
              <FriendCard key={`pending-${request.id}`} friend={request} isPending />
            ))}
          </div>
        )}

        {/* Friends List Section */}
        <div className="friends-list-group">
          <div className="friends-list-header">
            <h5 className="friends-list-heading">친구 목록</h5>
            <Input 
              placeholder="친구 검색..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <div className="friends-list">
            {filteredFriends.length > 0 ? (
              filteredFriends.map(friend => (
                <FriendCard key={friend.id} friend={friend} />
              ))
            ) : (
              <div className="no-friends-placeholder">친구를 추가해보세요.</div>
            )}
          </div>
        </div>
      </div>

      <div className="add-friend-section">
        <Button onClick={() => setIsModalOpen(true)} fullWidth>+ 친구 추가</Button>
        <AddFriendModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    </aside>
  );
};

export default FriendsPanel;