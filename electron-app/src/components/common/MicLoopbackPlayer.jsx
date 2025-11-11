import React, { useRef, useEffect } from 'react';
import { useAudioSettings } from '../../context/AudioSettingsContext';
import { useWebRTC } from '../../context/WebRTCContext';

const MicLoopbackPlayer = () => {
  const audioRef = useRef(null);
  const { isMicLoopbackEnabled, outputDeviceId, speakerVolume } = useAudioSettings();
  const { localStream } = useWebRTC() || {};

  useEffect(() => {
    const audioEl = audioRef.current;
    if (isMicLoopbackEnabled && localStream && audioEl) {
      audioEl.srcObject = localStream;
      audioEl.play().catch(error => console.error('Error playing loopback audio:', error));
    } else if (audioEl) {
      audioEl.srcObject = null;
    }
  }, [isMicLoopbackEnabled, localStream]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (audioEl && audioEl.setSinkId) {
      audioEl.setSinkId(outputDeviceId).catch(error => {
        console.error('Error setting audio output device:', error);
      });
    }
  }, [outputDeviceId]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.volume = speakerVolume;
    }
  }, [speakerVolume]);

  return <audio ref={audioRef} muted={false} />;
};

export default MicLoopbackPlayer;
