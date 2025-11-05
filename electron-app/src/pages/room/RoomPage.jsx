import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProfiles } from '../../context/ProfileContext';
import { useWebRTC } from '../../context/WebRTCContext';
import useVoiceActivity from '../../hooks/useVoiceActivity'; // Import the new hook
import RoomHeaderCard from '../../components/room/RoomHeaderCard';
import ChatPanel from '../../components/room/ChatPanel';
import Button from '../../components/common/Button';
import GlobalAudioStreams from '../../components/common/GlobalAudioStreams'; // Import the new component
import './RoomPage.css';

// Helper component to render each participant's media and profile
const ParticipantMedia = ({ participant, profile, isSpeaking, isMuted }) => {
  const avatarUrl = profile?.profile_image_url
    ? `http://localhost:3001${profile.profile_image_url}`
    : null;

  return (
    <div className={`participant-card ${isSpeaking && !isMuted ? 'speaking' : ''}`}>
      <div className="profile-avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt={participant.username} className="avatar-img" />
        ) : (
          <div className="avatar-placeholder">{participant.username.charAt(0)}</div>
        )}
        {isMuted && <div className="mute-indicator">🔇</div>}
      </div>
      <div className="username-display">{participant.username}</div>
    </div>
  );
};

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, currentRoom, sendMessage, addMessageListener, removeMessageListener } = useAuth();
  const { profiles, getProfile } = useProfiles();
  const { joinRoom, leaveRoom, localStream, remoteStreams, setLocalAudioMuted, isGlobalMuted, setIsGlobalMuted } = useWebRTC();

  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [speakingState, setSpeakingState] = useState({}); // For remote speakers

  // Use the hook for the local user's stream
  const isLocalUserSpeaking = useVoiceActivity({ stream: localStream });

  // Effect to join the room when the component mounts
  useEffect(() => {
    if (user && roomId) {
      joinRoom(roomId);
    } else {
      navigate('/lobby');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roomId, navigate]);

  // Effect for handling speaking status updates
  useEffect(() => {
    const handleSpeakingStatus = (payload) => {
      setSpeakingState(prev => ({ ...prev, [payload.userId]: payload.speaking }));
    };
    addMessageListener('speaking-status', handleSpeakingStatus);
    return () => removeMessageListener('speaking-status', handleSpeakingStatus);
  }, [addMessageListener, removeMessageListener]);

  // Effect for handling participants list
  useEffect(() => {
    if (!user) return;

    const handleRoomInfo = (payload) => {
      setParticipants(payload.participants || []);
    };

    const handleUserJoined = (payload) => {
      // Add participant only if they are not already in the list
      setParticipants(prev => 
        prev.find(p => p.id === payload.user.id) ? prev : [...prev, payload.user]
      );
    };

    const handleUserLeft = (payload) => {
      setParticipants(prev => prev.filter(p => p.id !== payload.userId));
    };

    addMessageListener('room-info', handleRoomInfo);
    addMessageListener('user-joined', handleUserJoined);
    addMessageListener('user-left', handleUserLeft);

    return () => {
      removeMessageListener('room-info', handleRoomInfo);
      removeMessageListener('user-joined', handleUserJoined);
      removeMessageListener('user-left', handleUserLeft);
    };

  }, [user, addMessageListener, removeMessageListener]);

  // Effect for chat message listeners and history
  useEffect(() => {
    if (!user || !roomId) return;

    sendMessage({ type: 'get-chat-history', payload: { roomId } });

    const handleNewMessage = (payload) => {
      setChatMessages(prevMessages => [...prevMessages, { ...payload, content: payload.content || payload.message }]); // Ensure content is used
      if (payload.userId && !profiles[payload.userId]) {
        getProfile(payload.userId);
      }
    };

    const handleChatHistory = (payload) => {
      setChatMessages(payload.messages.map(msg => ({ ...msg, content: msg.content || msg.message }))); // Ensure content is used
      payload.messages.forEach(msg => {
        if (msg.userId && !profiles[msg.userId]) {
          getProfile(msg.userId);
        }
      });
    };

    const handleMessageDeleted = (payload) => {
        setChatMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === payload.messageId
                    ? { ...msg, deletedAt: new Date().toISOString() } // Mark as deleted
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
  }, [user, roomId, sendMessage, addMessageListener, removeMessageListener, profiles, getProfile]);

  useEffect(() => {
    participants.forEach(p => getProfile(p.id));
  }, [participants, getProfile]);

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/lobby');
  };

  const handleSendMessage = (content) => { // Changed 'message' to 'content'
    if (user && roomId && content.trim()) {
      sendMessage({ type: 'chat-message', payload: { roomId, userId: user.id, content } }); // Changed 'message' to 'content'
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

  if (!currentRoom) {
    return <div className="room-page-layout">Joining room...</div>;
  }

  const localUserAvatarUrl = user?.profile_image_url
    ? `http://localhost:3001${user.profile_image_url}`
    : null;

  return (
    <div className="room-content-wrapper">
      {/* Render the GlobalAudioStreams component to handle remote audio */}
      <GlobalAudioStreams remoteStreams={remoteStreams} isGlobalMuted={isGlobalMuted} />

      <RoomHeaderCard 
        title={currentRoom.name} 
        roomType={currentRoom.roomType}
        isPrivate={currentRoom.isPrivate}
        categoryName={currentRoom.categoryName}
        categoryImageUrl={currentRoom.categoryImageUrl}
        onHangUp={handleLeaveRoom} 
      />
      <div className="room-main-content">
        <div className="participants-grid">
          {/* Local User */}
          <div className={`participant-card ${isLocalUserSpeaking && !isMuted ? 'speaking' : ''}`}>
            <div className="profile-avatar">
              {localUserAvatarUrl ? (
                <img src={localUserAvatarUrl} alt={user.username} className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">{user.username.charAt(0)}</div>
              )}
              {isMuted && <div className="mute-indicator">🔇</div>}
            </div>
            <div className="username-display">{user?.username} (Me)</div>
          </div>

          {/* Remote Participants */}
          {participants
            .filter(p => p.id !== user.id) // Exclude the local user
            .map(p => {
              const streamInfo = remoteStreams[p.id];
              const isParticipantMuted = streamInfo ? streamInfo.isMuted : false;
              return (
                <ParticipantMedia 
                  key={p.id} 
                  participant={p} 
                  profile={profiles[p.id]} 
                  isSpeaking={speakingState[p.id] || false}
                  isMuted={isParticipantMuted}
                />
              );
            })}
        </div>
        <div className="call-controls-bar">
          <Button onClick={handleToggleMute} size="small">
            {isMuted ? '음소거 해제' : '음소거'}
          </Button>
          <Button onClick={() => setIsGlobalMuted(!isGlobalMuted)} size="small">
            {isGlobalMuted ? '모든 소리 켜기' : '모든 소리 끄기'}
          </Button>
        </div>
        <ChatPanel roomId={roomId} messages={chatMessages} onSendMessage={handleSendMessage} onDeleteMessage={handleDeleteMessage} />
      </div>
    </div>
  );
};

export default RoomPage;