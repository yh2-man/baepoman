import React, { useState, useContext } from 'react';
import { useAuth } from '../../context/AuthContext';
import Input from '../common/Input';
import Button from '../common/Button';
import FriendCard from './FriendCard';
import AddFriendModal from './AddFriendModal';
import './FriendsPanel.css';

// MyProfileCard component to clearly separate logic
const MyProfileCard = () => {
  const { user } = useAuth();
  console.log('MyProfileCard user:', user); // Debug log

  if (!user) return null;

  const avatarUrl = user.profile_image_url
    ? `http://localhost:3001${user.profile_image_url}`
    : null;

  return (
    <div className="friend-card"> {/* Re-using friend-card style for consistency */}
      <div className="friend-avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt={user.username} className="friend-avatar-img" />
        ) : (
          user.username.charAt(0)
        )}
      </div>
      <div className="friend-info">
        <span className="friend-name">{user.username}</span>
        <div className="friend-status">
          <span className="status-dot online"></span>
          <span>Online</span>
        </div>
      </div>
    </div>
  );
};

const FriendsPanel = () => {
  const [friends, setFriends] = useState([]); // Removed mockFriends
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // TODO: Implement friend fetching logic here in a useEffect

  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <aside className="friends-panel">
      <div className="my-profile-section">
        <MyProfileCard />
      </div>

      <div className="friends-list-section">
        <div className="friends-list-header">
          <h4>친구 목록</h4>
          <Input 
            placeholder="친구 검색..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        <div className="friends-list custom-scrollbar">
          {filteredFriends.length > 0 ? (
            filteredFriends.map(friend => (
              <FriendCard key={friend.id} friend={friend} />
            ))
          ) : (
            <div className="no-friends-placeholder">친구를 추가해보세요.</div>
          )}
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