import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RoomCard.css';
// import { getCategoryImage } from '../../constants/categories'; // Removed

const RoomCard = ({ room }) => {
  const navigate = useNavigate();
  // const backgroundImage = getCategoryImage(room.category); // Removed

  const handleJoinRoom = () => {
    navigate(`/room/${room.roomId}`);
  };

  return (
    <div
      className="room-card"
      style={{ backgroundImage: `url(${room.categoryImageUrl})` }} // Use categoryImageUrl directly
      onClick={handleJoinRoom}
    >
      <div className="room-card-overlay">
        <div className="room-card-header">
          <span className="room-card-title">{room.roomName}</span>
          {room.isPrivate && <span className="room-card-private-icon">🔒</span>} {/* Private icon */}
        </div>
        <div className="room-card-category">{room.categoryName}</div> {/* Display category name */}
        <div className="room-card-footer">
          <span className="room-card-host">{room.hostName}</span>
          <span className="room-card-participants">
            {room.participantCount} / {room.maxParticipants}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
