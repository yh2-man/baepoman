import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useNotification } from '../../context/NotificationContext';

const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;



const NotificationContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const NotificationItem = styled.div`
  background-color: ${props => {
    switch (props.$type) {
      case 'success': return 'var(--success-color)';
      case 'error': return 'var(--error-color)';
      case 'warning': return 'var(--warning-color)';
      default: return 'var(--info-color)';
    }
  }};
  color: var(--text-color-inverted);
  padding: 15px 20px;
  border-radius: var(--border-radius);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  animation: ${slideIn} 0.3s forwards;
  opacity: 0;
  min-width: 250px;
  max-width: 350px;
  word-wrap: break-word;
`;

function NotificationDisplay() {
  const { notifications } = useNotification();

  return (
    <NotificationContainer>
      {notifications.map((notif) => (
        <NotificationItem key={notif.id} $type={notif.type}>
          {notif.message}
        </NotificationItem>
      ))}
    </NotificationContainer>
  );
}

export default NotificationDisplay;
