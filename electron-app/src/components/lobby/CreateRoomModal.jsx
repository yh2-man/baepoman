import React, { useState } from 'react';
import './CreateRoomModal.css';
import Button from '../common/Button';
import Input from '../common/Input';
// import { CATEGORIES } from '../../constants/categories'; // Removed
import AutocompleteSelect from '../common/AutocompleteSelect';

const CreateRoomModal = ({ isOpen, onClose, onCreate, categories }) => { // Add categories prop
  const [roomName, setRoomName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [selectedCategoryName, setSelectedCategoryName] = useState(''); // To store selected category name
  const [isPrivate, setIsPrivate] = useState(false); // New state for private room

  const handleMaxParticipantsChange = (e) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value)) {
      value = '';
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
      return;
    }

    // Resolve categoryId from selectedCategoryName
    const selectedCategory = categories.find(cat => cat.name === selectedCategoryName);
    const categoryId = selectedCategory ? selectedCategory.id : null;

    // Validation for category if needed (e.g., if a category is required)
    if (selectedCategoryName && !categoryId) {
        // addNotification('유효한 카테고리를 선택해주세요.', 'error'); // Uncommented
        return;
    }

    onCreate({ 
        roomName, 
        maxParticipants, 
        categoryId, // Pass categoryId
        isPrivate,  // Pass isPrivate
        roomType: 'group', // Hardcode type for this modal
    });
    
    // Reset state after creation
    setRoomName('');
    setSelectedCategoryName('');
    setMaxParticipants(5);
    setIsPrivate(false);
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

        <div className="form-group">
          <label>카테고리</label>
          <AutocompleteSelect
            options={categories.map(cat => cat.name)} // Use category names for options
            value={selectedCategoryName}
            onChange={setSelectedCategoryName}
            placeholder="카테고리 검색 또는 선택"
          />
        </div>

        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            id="is-private"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
          />
          <label htmlFor="is-private">비공개 방</label>
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