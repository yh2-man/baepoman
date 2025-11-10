import React, { useState, useEffect, useRef } from 'react';
import { useFriends } from '../../context/FriendsContext';
import { useNotification } from '../../context/NotificationContext';
import Button from '../common/Button';
import Input from '../common/Input';
import './AddFriendModal.css';

const AddFriendModal = ({ isOpen, onClose }) => {
  const [fullTag, setFullTag] = useState('');
  const { sendFriendRequest } = useFriends();
  const { addNotification } = useNotification();
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

  const handleSendRequest = () => {
    if (!fullTag.trim() || !fullTag.includes('#')) {
      addNotification('올바른 형식으로 입력해주세요 (예: username#1234).', 'error');
      return;
    }
    sendFriendRequest(fullTag);
    addNotification(`'${fullTag}'님에게 친구 요청을 보냈습니다.`, 'success');
    setFullTag('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="add-friend-modal-overlay">
        <div ref={popoverRef} className="add-friend-popover visible">
            <h2>친구 추가</h2>
            <p>친구의 사용자명과 태그를 입력해주세요.</p>
            <Input
                value={fullTag}
                onChange={(e) => setFullTag(e.target.value)}
                placeholder="username#1234"
            />
            <div className="modal-actions">
                <Button onClick={onClose} variant="secondary">취소</Button>
                <Button onClick={handleSendRequest}>친구 요청 보내기</Button>
            </div>
        </div>
    </div>
  );
};

export default AddFriendModal;