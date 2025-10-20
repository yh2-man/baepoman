import React, { useState, useEffect, useRef } from 'react';
// import { useNotification } from '../../context/NotificationContext';
import Button from '../common/Button';
import Input from '../common/Input';
import './AddFriendModal.css';

const AddFriendModal = ({ isOpen, onClose }) => {
  const [friendId, setFriendId] = useState('');
  // const { addNotification } = useNotification();
  const popoverRef = useRef(null);

  // 팝오버 바깥을 클릭하면 닫히는 로직
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
    if (!friendId.trim()) {
      // addNotification('사용자 아이디를 입력해주세요.', 'error');
      return;
    }
    console.log(`Sending friend request to: ${friendId}`);
    // addNotification(`'${friendId}'님에게 친구 요청을 보냈습니다.`, 'success');
    setFriendId('');
    onClose();
  };

  return (
    <div 
      ref={popoverRef} 
      className={`add-friend-popover ${isOpen ? 'visible' : ''}`}>
              <h2>친구 추가</h2>
              <p>추가할 친구의 닉네임 또는 아이디(이메일)를 입력하세요.</p>
              <Input
                value={friendId}
                onChange={(e) => setFriendId(e.target.value)}
                placeholder="닉네임 또는 아이디 입력"
              />
              <div className="modal-actions">
                <Button onClick={onClose} variant="secondary">취소</Button>
                <Button onClick={handleSendRequest}>요청</Button>
              </div>    </div>
  );
};

export default AddFriendModal;