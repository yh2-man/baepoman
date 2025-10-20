import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProfiles } from '../../context/ProfileContext';
import { useWebRTC } from '../../context/WebRTCContext';
import RoomHeaderCard from '../../components/room/RoomHeaderCard';
import ChatPanel from '../../components/room/ChatPanel'; // Import ChatPanel
import Button from '../../components/common/Button'; // Import Button component
import './RoomPage.css';

// Helper component to render each participant's media and profile
const ParticipantMedia = ({ participant, stream, profile }) => {
  // Removed audioRef and its useEffect
  // Removed <audio> tag

  const avatarUrl = profile?.profile_image_url
    ? `http://localhost:3001${profile.profile_image_url}`
    : null;

  return (
    <div className="participant-card">
      <div className="profile-avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt={participant.username} className="avatar-img" />
        ) : (
          <div className="avatar-placeholder">{participant.username.charAt(0)}</div>
        )}
      </div>
      <div className="username-display">{participant.username}</div>
      {/* Audio is now handled by GlobalAudioStreams */}
    </div>
  );
};

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, currentRoom, sendMessage, addMessageListener, removeMessageListener } = useAuth();
  const { profiles, getProfile } = useProfiles();
  const { joinRoom, leaveRoom, localStream, remoteStreams, setLocalAudioMuted } = useWebRTC();

  const [chatMessages, setChatMessages] = useState([]); // State for chat messages
  const [isMuted, setIsMuted] = useState(false); // State for local mute status

  // Effect to join the room when the component mounts
  useEffect(() => {
    if (user && roomId) {
      joinRoom(roomId);
    } else {
      navigate('/lobby');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roomId, navigate]);

  // Removed Effect to handle local mute/unmute
  // useEffect(() => {
  //   console.log('[DEBUG] Mute useEffect ran. isMuted:', isMuted, 'localStream:', localStream);
  //   if (localStream) {
  //     const audioTracks = localStream.getAudioTracks();
  //     console.log('[DEBUG] LocalStream audio tracks found:', audioTracks.length);
  //     audioTracks.forEach(track => {
  //       track.enabled = !isMuted;
  //       console.log('[DEBUG] Audio track enabled state set to:', track.enabled, 'for track:', track.id);
  //     });
  //   } else {
  //     console.log('[DEBUG] LocalStream is not available.');
  //   }
  // }, [isMuted, localStream]);

  // Removed Effect to attach local stream to the audio element

  // Effect for chat message listeners and history
  useEffect(() => {
    if (!user || !roomId) return;

    // Request chat history when joining the room
    sendMessage({ type: 'get-chat-history', payload: { roomId } });

    const handleNewMessage = (payload) => {
      setChatMessages(prevMessages => [...prevMessages, payload]);
      // Also fetch profile for the sender if not already in cache
      if (payload.userId && !profiles[payload.userId]) {
        getProfile(payload.userId);
      }
    };

    const handleChatHistory = (payload) => {
      setChatMessages(payload.messages);
      // Fetch profiles for all senders in history
      payload.messages.forEach(msg => {
        if (msg.userId && !profiles[msg.userId]) {
          getProfile(msg.userId);
        }
      });
    };

    addMessageListener('new-message', handleNewMessage);
    addMessageListener('chat-history', handleChatHistory);

    return () => {
      removeMessageListener('new-message', handleNewMessage);
      removeMessageListener('chat-history', handleChatHistory);
    };
  }, [user, roomId, sendMessage, addMessageListener, removeMessageListener, profiles, getProfile]);


  // The participant list is now derived from remoteStreams + local user
  const participants = Object.keys(remoteStreams).map(userId => ({
      id: userId,
      username: profiles[userId]?.username || '...'
  }));

  // Effect to fetch profiles for new participants
  useEffect(() => {
    participants.forEach(p => getProfile(p.id));
  }, [participants, getProfile]);

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/lobby');
  };

  const handleSendMessage = (message) => {
    if (user && roomId && message.trim()) {
      sendMessage({ type: 'chat-message', payload: { roomId, userId: user.id, message } });
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
      <RoomHeaderCard title={currentRoom.name} onHangUp={handleLeaveRoom} />
      <div className="room-main-content">
        <div className="participants-grid">
          {/* Local User */}
          <div className="participant-card">
            <div className="profile-avatar">
              {localUserAvatarUrl ? (
                <img src={localUserAvatarUrl} alt={user.username} className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">{user.username.charAt(0)}</div>
              )}
            </div>
            <div className="username-display">{user?.username} (Me)</div>
            {/* Audio is now handled by GlobalAudioStreams */}
          </div>

          {/* Remote Participants */}
          {participants.map(p => (
            <ParticipantMedia key={p.id} participant={p} stream={remoteStreams[p.id]} profile={profiles[p.id]} />
          ))}
        </div>
        <div className="call-controls-bar">
          <Button onClick={handleToggleMute} size="small">
            {isMuted ? '음소거 해제' : '음소거'}
          </Button>
        </div>
        <ChatPanel roomId={roomId} messages={chatMessages} onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};

export default RoomPage;