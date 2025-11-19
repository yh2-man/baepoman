import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWebRTC } from '../../context/WebRTCContext';
import InviteFriendModal from '../../components/room/InviteFriendModal';
import { useFriends } from '../../context/FriendsContext';
import { useVoiceSubtitle } from '../../context/VoiceSubtitleContext';
import VoiceSubtitleChat from '../../components/room/VoiceSubtitleChat';
import RoomHeaderCard from '../../components/room/RoomHeaderCard';
import Button from '../../components/common/Button';
import ChatPanel from '../../components/room/ChatPanel';
import ProfileAvatar from '../../components/common/ProfileAvatar'; // Import the new component
import './RoomPage.css';

// Updated component to use ProfileAvatar
const ParticipantMedia = ({ participant }) => {
  const { user, isMuted, isSpeaking } = participant;

  if (!user) {
    return null;
  }

  return (
    <div className={`participant-card ${isSpeaking && !isMuted ? 'speaking' : ''}`}>
      <ProfileAvatar user={user} size="large" isMuted={isMuted} />
      <div className="username-display">{user.username}</div>
    </div>
  );
};

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, currentRoom, loading, sendMessage, addMessageListener, removeMessageListener } = useAuth();
  const { friends } = useFriends();
  
  const { joinRoom, leaveRoom, participants, setLocalAudioMuted, isGlobalMuted, setIsGlobalMuted, isLocalUserSpeaking } = useWebRTC();
  const { showVoiceSubtitleChat, toggleVoiceSubtitleChat } = useVoiceSubtitle();

  const [chatMessages, setChatMessages] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0, bottom: 0 });
  const inviteButtonRef = useRef(null);
  
  useEffect(() => {
    if (loading) {
      return;
    }
    if (user && roomId) {
      joinRoom(roomId);
    } else {
      navigate('/lobby');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roomId, loading, navigate]);

  useEffect(() => {
    if (loading || !user || !roomId) return;

    sendMessage({ type: 'get-chat-history', payload: { roomId } });

    const handleNewMessage = (payload) => {
      setChatMessages(prev => [...prev, payload]);
    };
    const handleChatHistory = (payload) => {
      setChatMessages(payload.messages || []);
    };
    const handleMessageDeleted = (payload) => {
        setChatMessages(prev =>
            prev.map(msg =>
                msg.id === payload.messageId
                    ? { ...msg, deleted_at: new Date().toISOString(), content: '삭제된 메시지입니다.' }
                    : msg
            )
        );
    };

    addMessageListener('new-message', handleNewMessage);
    addMessageListener('chat-history', handleChatHistory);
    addMessageListener('message-deleted', handleMessageDeleted);

    return () => {
      removeMessageListener('new-message', handleNewMessage);
      removeMessageListener('chat-history', handleChatHistory);
      removeMessageListener('message-deleted', handleMessageDeleted);
    };
  }, [user, roomId, loading, sendMessage, addMessageListener, removeMessageListener]);


  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/lobby');
  };

  const handleSendMessage = (content) => {
    if (user && roomId && content.trim()) {
      sendMessage({ type: 'chat-message', payload: { roomId, userId: user.id, content } });
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (user && roomId && messageId) {
        sendMessage({ type: 'delete-message', payload: { messageId } });
    }
  };

  const handleToggleMute = () => {
    setIsMuted(prev => {
      const newMuteState = !prev;
      setLocalAudioMuted(newMuteState);
      return newMuteState;
    });
  };

  const handleInviteFriend = () => {
    if (inviteButtonRef.current) {
      const rect = inviteButtonRef.current.getBoundingClientRect();
      setModalPosition({
        bottom: window.innerHeight - rect.top + 8, // 8px gap above the button
        left: rect.left + rect.width / 2,
      });
    }
    setIsInviteModalOpen(true);
  };

  const handleSendFriendInvitation = (friend) => {
    const invitationMessage = {
      type: 'room-invite',
      roomId: currentRoom.id,
      roomName: currentRoom.name,
      inviterId: user.id,
      inviterUsername: user.username,
    };
    sendMessage({ type: 'direct-message', payload: { receiverId: friend.id, content: JSON.stringify(invitationMessage) } });
    setIsInviteModalOpen(false); // Close modal after sending
  };

  if (!currentRoom) {
    return <div className="room-page-layout">Joining room...</div>;
  }

  return (
    <div className="room-content-wrapper">
      <RoomHeaderCard 
        title={currentRoom.name} 
        onHangUp={handleLeaveRoom} 
      />
      <div className="room-body-layout">
        <div className="room-main-content">
          <div className="participants-grid">
            {/* Local User */}
            <div className={`participant-card ${isLocalUserSpeaking && !isMuted ? 'speaking' : ''}`}>
              <ProfileAvatar user={user} size="large" isMuted={isMuted} />
              <div className="username-display">{user?.username} (Me)</div>
            </div>

            {/* Remote Participants from the unified state */}
            {Object.values(participants)
              .filter(p => p.user) // Filter out participants without user info
              .map(p => (
                <ParticipantMedia 
                  key={p.user.id} 
                  participant={p} 
                />
              ))}
          </div>
          <div className="call-controls-bar">
            <Button ref={inviteButtonRef} onClick={handleInviteFriend} size="small">
              친구 초대
            </Button>
            <Button onClick={handleToggleMute} size="small">
              {isMuted ? '음소거 해제' : '음소거'}
            </Button>
            <Button onClick={() => setIsGlobalMuted(!isGlobalMuted)} size="small">
              {isGlobalMuted ? '모든 소리 켜기' : '모든 소리 끄기'}
            </Button>
            <Button onClick={toggleVoiceSubtitleChat} size="small">
              {showVoiceSubtitleChat ? '자막 숨기기' : '자막 보이기'}
            </Button>
          </div>
          <ChatPanel roomId={roomId} messages={chatMessages} onSendMessage={handleSendMessage} onDeleteMessage={handleDeleteMessage} />
        </div>
        {showVoiceSubtitleChat && <VoiceSubtitleChat />}
      </div>
      {isInviteModalOpen && (
        <InviteFriendModal
          isOpen={isInviteModalOpen}
          friends={friends}
          onClose={() => setIsInviteModalOpen(false)}
          onInviteFriend={handleSendFriendInvitation}
          position={modalPosition}
        />
      )}
    </div>
  );
};

export default RoomPage;
