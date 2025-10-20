import React, { useState } from 'react';
import './CreateRoomModal.css';
import Button from '../common/Button';
import Input from '../common/Input';
import { CATEGORIES } from '../../constants/categories';
// import { useNotification } from '../../context/NotificationContext';
import AutocompleteSelect from '../common/AutocompleteSelect'; // <-- Import the new reusable component

const CreateRoomModal = ({ isOpen, onClose, onCreate }) => {
  const [roomName, setRoomName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [category, setCategory] = useState('');
  // const { addNotification } = useNotification();

  const handleMaxParticipantsChange = (e) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value)) {
      value = ''; // Allow clearing the input
    } else if (value > 20) {
      value = 20;
    }
    setMaxParticipants(value);
  };

  if (!isOpen) {
    return null;
  }

  const handleSubmit = () => {
    if (!roomName.trim()) {
      // addNotification('방 제목을 입력해주세요.', 'error');
      return;
    }
    // Ensure the category is valid before creating
    if (!CATEGORIES.includes(category)) {
        // addNotification('유효한 카테고리를 선택해주세요.', 'error');
        return;
    }
    onCreate({ roomName, maxParticipants, category });
    
    // Reset state after creation
    setRoomName('');
    setCategory('');
    setMaxParticipants(5);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>방 생성</h2>
        
        <div className="form-group">
          <Input
            label="방 제목"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="방 제목을 입력하세요"
          />
        </div>

        <div className="form-group">
          <label htmlFor="max-participants">최대 인원 (최대 20명)</label>
          <input
            type="number"
            id="max-participants"
            value={maxParticipants}
            onChange={handleMaxParticipantsChange}
            min="2"
            max="20"
          />
        </div>

        {/* Use the new reusable AutocompleteSelect component */}
        <div className="form-group">
          <label>카테고리</label>
          <AutocompleteSelect
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
            placeholder="카테고리 검색 또는 선택"
          />
        </div>

        <div className="modal-actions">
          <Button onClick={onClose} variant="secondary" width="100%">취소</Button>
          <Button onClick={handleSubmit} width="100%">생성</Button>
        </div>
      </div>
    </div>
  );
};

export default CreateRoomModal;