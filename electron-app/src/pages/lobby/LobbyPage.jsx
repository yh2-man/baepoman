import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import RoomCard from '../../components/lobby/RoomCard';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import CreateRoomModal from '../../components/lobby/CreateRoomModal';
import AutocompleteSelect from '../../components/common/AutocompleteSelect';
import { useNotification } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import ActiveCallCard from '../../components/lobby/ActiveCallCard';

const LobbyPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomNameFilter, setRoomNameFilter] = useState('');
  
  const allCategoriesLabel = '모든 카테고리';
  const [categoryFilter, setCategoryFilter] = useState(allCategoriesLabel);

  const { user, sendMessage, addMessageListener, removeMessageListener, isSocketAuthenticated, rooms, categories, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  // Function to request categories from server
  const requestCategories = useCallback(() => {
    sendMessage({ type: 'get-categories' });
  }, [sendMessage]);

  // This effect now only handles the navigation part of room creation.
  // The room list itself is updated globally by AuthContext.
  useEffect(() => {
    const handleCreateRoomSuccess = (newlyCreatedRoom) => {
      console.log('[LobbyPage] handleCreateRoomSuccess called with payload:', JSON.stringify(newlyCreatedRoom, null, 2));
      if (newlyCreatedRoom && newlyCreatedRoom.id) {
        navigate(`/room/${newlyCreatedRoom.id}`);
      } else {
        console.error('Could not navigate to new room, ID is missing in payload:', newlyCreatedRoom);
        addNotification('방 생성 후 자동 입장에 실패했습니다.', 'error');
      }
    };
    
    addMessageListener('room-creation-success', handleCreateRoomSuccess);
    return () => removeMessageListener('room-creation-success', handleCreateRoomSuccess);
  }, [addMessageListener, removeMessageListener, navigate, addNotification]);


  // Effect for fetching initial data based on connection status
  useEffect(() => {
    if (isSocketAuthenticated) {
      sendMessage({ type: 'get-rooms' }); // Request rooms directly
      requestCategories(); // Request categories
    }
  }, [isSocketAuthenticated, sendMessage, requestCategories]);

  const handleCreateRoom = (newRoomData) => {
    if (!user) {
      console.error("Cannot create room: User not logged in.");
      return;
    }
    if (!newRoomData.roomName.trim()) {
      addNotification('방 제목을 입력해주세요.', 'error');
      return;
    }

    const payload = {
      name: newRoomData.roomName,
      categoryId: newRoomData.categoryId,
      maxParticipants: newRoomData.maxParticipants,
      userId: user.id,
      isPrivate: newRoomData.isPrivate || false,
      roomType: 'group',
    };

    sendMessage({ type: 'create-room', payload }); // Create room directly
    setIsModalOpen(false);
  };

  const filteredRooms = rooms.filter(room => {
    if (room.isPrivate) {
      return false;
    }
    const nameMatch = room.roomName.toLowerCase().includes(roomNameFilter.toLowerCase());
    
    const categoryMatch = categoryFilter === allCategoriesLabel || 
                          categoryFilter === '' || 
                          (room.category && room.category.toLowerCase().includes(categoryFilter.toLowerCase()));

    return nameMatch && categoryMatch;
  });

  return (
    <div className="lobby-page-main">
      <ActiveCallCard />
      <header className="lobby-page-header">
        <div className="room-filters">
          <div className="category-filter-wrapper">
            <AutocompleteSelect
              options={categories.map(cat => cat.name)}
              value={categoryFilter}
              onChange={setCategoryFilter}
              allOptionsLabel={allCategoriesLabel}
              placeholder="카테고리 검색..."
            />
          </div>
          <div className="room-name-filter-wrapper">
            <Input 
              placeholder="방 제목 검색..."
              value={roomNameFilter}
              onChange={e => setRoomNameFilter(e.target.value)}
            />
          </div>
          <Button className="create-room-button" onClick={() => setIsModalOpen(true)} width="120px">+ 방 생성</Button>
        </div>
      </header>

      <main className="room-list-container custom-scrollbar">
        {authLoading && rooms.length === 0 ? (
          <div className="loading-indicator">방 목록을 불러오는 중...</div>
        ) : (
          <div className="room-list">
            {filteredRooms.map(room => (
              <RoomCard key={room.roomId} room={room} />
            ))}
          </div>
        )}
      </main>

      <CreateRoomModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)} 
        onCreate={handleCreateRoom}
        categories={categories}
      />
    </div>
  );
};

export { LobbyPage };