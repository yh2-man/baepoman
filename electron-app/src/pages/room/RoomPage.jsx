import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWebRTC } from '../../context/WebRTCContext';
import InviteFriendModal from '../../components/room/InviteFriendModal';
import { useFriends } from '../../context/FriendsContext';
import { useVoiceSubtitle } from '../../context/VoiceSubtitleContext';
import { useChat } from '../../hooks/useChat';
import VoiceSubtitleChat from '../../components/room/VoiceSubtitleChat';
import RoomHeaderCard from '../../components/room/RoomHeaderCard';
import Button from '../../components/common/Button';
import ChatPanel from '../../components/room/ChatPanel';
import ProfileAvatar from '../../components/common/ProfileAvatar'; // Import the new component
import ParticipantContextMenu from '../../components/room/ParticipantContextMenu'; // Import ParticipantContextMenu
import './RoomPage.css';

// Updated component to use ProfileAvatar
const ParticipantMedia = ({ participant, onContextMenu, isCurrentUserHost, currentUserId, roomHostId }) => {
  const { user, isMuted, isSpeaking } = participant;

  if (!user) {
    return null;
  }

  return (
    <div 
      className={`participant-card ${isSpeaking && !isMuted ? 'speaking' : ''}`}
      onContextMenu={(e) => onContextMenu(e, user.id)} // Add onContextMenu
    >
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
  const { chatMessages, handleSendMessage, handleDeleteMessage } = useChat(roomId);

  const [isMuted, setIsMuted] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0, bottom: 0 });
  const [contextMenu, setContextMenu] = useState(null); // State for context menu { x, y, participantId }
  const contextMenuRef = useRef(null); // Ref for context menu element
  const inviteButtonRef = useRef(null);
  
  // New: Handle context menu
  const handleContextMenu = (event, participantId) => {
    event.preventDefault(); // Prevent default browser context menu
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      participantId: participantId,
    });
  };

  const dismissContextMenu = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        dismissContextMenu();
      }
    };
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        dismissContextMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [contextMenu]); // Only re-run if contextMenu state changes
  
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

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/lobby');
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

  const handleKickParticipant = (participantId) => {
    console.log(`Kicking participant: ${participantId}`);
    sendMessage({
      type: 'kick-participant',
      payload: {
        roomId: currentRoom.id,
        targetParticipantId: participantId,
      },
    });
    dismissContextMenu();
  };
  
  // New: Listener for when the current user is kicked
  useEffect(() => {
    const handleKicked = (payload) => {
      console.log('You have been kicked from the room:', payload);
      leaveRoom(); // Call leaveRoom from useWebRTC
      navigate('/lobby'); // Navigate to lobby
    };

    addMessageListener('kicked-from-room', handleKicked);

    return () => {
      removeMessageListener('kicked-from-room', handleKicked);
    };
  }, [addMessageListener, removeMessageListener, leaveRoom, navigate]); // Add dependencies

  // Check if current user is host
  const isCurrentUserHost = user?.id === currentRoom?.hostId;

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
            <div 
              className={`participant-card ${isLocalUserSpeaking && !isMuted ? 'speaking' : ''}`}
              onContextMenu={(e) => handleContextMenu(e, user.id)} // Add onContextMenu
            >
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
                  onContextMenu={handleContextMenu} // Pass handler
                  isCurrentUserHost={isCurrentUserHost} // Pass host status
                  currentUserId={user?.id} // Pass current user ID
                  roomHostId={currentRoom?.hostId} // Pass room host ID
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
      {contextMenu && (
        <ParticipantContextMenu
          ref={contextMenuRef}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={dismissContextMenu}
          targetParticipantId={contextMenu.participantId}
          isCurrentUserHost={isCurrentUserHost}
          onKick={handleKickParticipant}
          currentUserId={user?.id} // Current user id to prevent self-kick
        />
      )}
    </div>
  );
};

export default RoomPage;
