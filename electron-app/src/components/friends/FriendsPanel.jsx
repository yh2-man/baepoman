import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../context/FriendsContext';
import Input from '../common/Input';
import Button from '../common/Button';
import FriendCard from './FriendCard';
import AddFriendModal from './AddFriendModal';
import FriendRequestModal from './FriendRequestModal'; // Import the new component
import ProfileAvatar from '../common/ProfileAvatar'; // Import the new component
import './FriendsPanel.css';

// A simpler component for the current user's profile display
const MyProfile = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="friend-card">
      <ProfileAvatar user={user} />
      <div className="friend-info">
        <span className="friend-name">{user.username}</span>
        <span className="friend-tag">#{user.tag}</span>
      </div>
    </div>
  );
};

const FriendsPanel = () => {
  const [filter, setFilter] = useState('');
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [isFriendRequestModalOpen, setIsFriendRequestModalOpen] = useState(false);
  const { friends, pendingRequests } = useFriends();
  const { user } = useAuth(); // Get user for the key

  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <aside className="friends-panel">
      <div className="my-profile-section">
        {/* Use the new simplified component */}
        <MyProfile />
      </div>

      <div className="friends-list-section custom-scrollbar">

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
        {/* Wrapper for Add Friend Button */}
        <div style={{ position: 'relative', flex: '1' }}>
            <Button onClick={() => setIsAddFriendModalOpen(true)}>+ 친구 추가</Button>
        </div>
        {/* Wrapper for Friend Request Button */}
        <div style={{ position: 'relative', flex: '1' }}>
            <Button onClick={() => setIsFriendRequestModalOpen(true)} variant="secondary">친구 요청</Button>
            {pendingRequests.incoming.length > 0 && (
                <span className="friend-request-badge">
                    {pendingRequests.incoming.length}
                </span>
            )}
        </div>
        <AddFriendModal isOpen={isAddFriendModalOpen} onClose={() => setIsAddFriendModalOpen(false)} />
        <FriendRequestModal isOpen={isFriendRequestModalOpen} onClose={() => setIsFriendRequestModalOpen(false)} />
      </div>
    </aside>
  );
};

export default FriendsPanel;