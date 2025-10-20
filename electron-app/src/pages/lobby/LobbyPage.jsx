import React, { useState, useEffect } from 'react';
import { requestRooms, createRoom } from '../../api/roomApi';
import { useAuth } from '../../context/AuthContext';
import RoomCard from '../../components/lobby/RoomCard';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import CreateRoomModal from '../../components/lobby/CreateRoomModal';
import { CATEGORIES } from '../../constants/categories';
// import FriendsPanel from '../../components/friends/FriendsPanel'; // Removed
import AutocompleteSelect from '../../components/common/AutocompleteSelect'; // <-- Import AutocompleteSelect
import { useNotification } from '../../context/NotificationContext'; // Uncommented
import { useNavigate } from 'react-router-dom';
import ActiveCallCard from '../../components/lobby/ActiveCallCard'; // Import ActiveCallCard

const LobbyPage = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomNameFilter, setRoomNameFilter] = useState('');
  
  const allCategoriesLabel = '모든 카테고리';
  const [categoryFilter, setCategoryFilter] = useState(allCategoriesLabel);

  const { user, sendMessage, addMessageListener, removeMessageListener, isConnected } = useAuth();
  const { addNotification } = useNotification(); // Uncommented
  const navigate = useNavigate();

  useEffect(() => {
    console.log('LobbyPage mounted');
    const handleRoomsList = (roomList) => {
      const formattedRooms = roomList.map(room => ({ ...room, roomName: room.name, roomId: room.id }));
      setRooms(formattedRooms);
      setLoading(false);
    };

    const handleRoomCreated = (newRoom) => {
      const formattedNewRoom = { ...newRoom, roomName: newRoom.name, roomId: newRoom.id };
      setRooms(prevRooms => [formattedNewRoom, ...prevRooms]);
    };

    const handleRoomDeleted = (payload) => {
      const { roomId } = payload;
      const numericRoomId = parseInt(roomId, 10);
      setRooms(prevRooms => prevRooms.filter(room => room.roomId !== numericRoomId));
    };

    const handleRoomUpdated = (payload) => {
      console.log('[DEBUG] Received room-updated:', payload); // Debug log
      const { roomId, participantCount } = payload;
      const numericRoomId = parseInt(roomId, 10);
      setRooms(prevRooms => {
        const newRooms = prevRooms.map(room =>
          room.roomId === numericRoomId ? { ...room, participantCount } : room
        );
        console.log('[DEBUG] New rooms state after update:', newRooms); // Debug log
        return newRooms;
      });
    };

    addMessageListener('rooms-list', handleRoomsList);
    addMessageListener('room-created', handleRoomCreated);
    addMessageListener('room-deleted', handleRoomDeleted);
    addMessageListener('room-updated', handleRoomUpdated);

    const handleCreateRoomSuccess = (newlyCreatedRoom) => {
      if (newlyCreatedRoom && newlyCreatedRoom.id) {
        navigate(`/room/${newlyCreatedRoom.id}`);
      } else {
        console.error('Could not navigate to new room, ID is missing in payload:', newlyCreatedRoom);
        addNotification('방 생성 후 자동 입장에 실패했습니다.', 'error');
      }
    };

    addMessageListener('room-creation-success', handleCreateRoomSuccess);

    if (isConnected) {
      requestRooms(sendMessage);
    } else {
      setLoading(true); // Show loading if disconnected
      setRooms([]); // Clear rooms if disconnected
    }

    return () => {
      console.log('LobbyPage unmounted');
      removeMessageListener('rooms-list', handleRoomsList);
      removeMessageListener('room-created', handleRoomCreated);
      removeMessageListener('room-deleted', handleRoomDeleted);
      removeMessageListener('room-updated', handleRoomUpdated);
      removeMessageListener('room-creation-success', handleCreateRoomSuccess);
    };
  }, [isConnected, sendMessage, addMessageListener, removeMessageListener, navigate, addNotification]);

  const handleCreateRoom = (newRoomData) => {
    if (!user) {
      console.error("Cannot create room: User not logged in.");
      return;
    }
    if (!newRoomData.roomName.trim()) {
      addNotification('방 제목을 입력해주세요.', 'error'); // Uncommented
      return;
    }
    // Ensure the category is valid before creating
    if (!CATEGORIES.includes(newRoomData.category)) { // Changed category to newRoomData.category
        addNotification('유효한 카테고리를 선택해주세요.', 'error'); // Uncommented
        return;
    }
    const payload = {
      name: newRoomData.roomName,
      category: newRoomData.category,
      maxParticipants: newRoomData.maxParticipants,
      userId: user.id,
    };
    createRoom(sendMessage, payload);
    setIsModalOpen(false);
  };

  // Update filtering logic for autocomplete
  const filteredRooms = rooms.filter(room => {
    const nameMatch = room.roomName.toLowerCase().includes(roomNameFilter.toLowerCase());
    
    const categoryMatch = categoryFilter === allCategoriesLabel || 
                          categoryFilter === '' || 
                          room.category.toLowerCase().includes(categoryFilter.toLowerCase());

    return nameMatch && categoryMatch;
  });

  return (
    <div className="lobby-page-main"> {/* Removed lobby-layout and FriendsPanel */}
      <ActiveCallCard />
      <header className="lobby-page-header">
        <div className="room-filters">
          <div className="category-filter-wrapper">
            <AutocompleteSelect
              options={CATEGORIES}
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
        {loading ? (
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
      />
    </div>
  );
};

export { LobbyPage };