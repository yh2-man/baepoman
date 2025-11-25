import React, { useEffect } from 'react';
import { useAudioSettings } from '../../context/AudioSettingsContext';
import { useWebRTC } from '../../context/WebRTCContext';
import './AudioSettings.css';

const AudioSettings = () => {
  const {
    inputDevices,
    outputDevices,
    inputDeviceId,
    setInputDeviceId,
    outputDeviceId,
    setOutputDeviceId,
    micVolume,
    setMicVolume,
    speakerVolume,
    setSpeakerVolume,
    isMicLoopbackEnabled,
    setIsMicLoopbackEnabled,
    audioBitrate,
    setAudioBitrate,
  } = useAudioSettings();

  const { activateLocalStream, isMicActive } = useWebRTC() || {};

  // Effect to activate the microphone when loopback is enabled
  useEffect(() => {
    if (isMicLoopbackEnabled && !isMicActive && activateLocalStream) {
      activateLocalStream();
    }
  }, [isMicLoopbackEnabled, isMicActive, activateLocalStream]);

  const bitrateOptions = [
    { value: 8000, label: '8 kbps (최저)' },
    { value: 16000, label: '16 kbps (낮음)' },
    { value: 32000, label: '32 kbps (표준)' },
    { value: 64000, label: '64 kbps (높음)' },
    { value: 128000, label: '128 kbps (최고)' },
  ];

  return (
    <div className="audio-settings-panel">
      <h3 className="settings-header">오디오 설정</h3>

      <div className="settings-group">
        <label htmlFor="mic-select">마이크</label>
        <select
          id="mic-select"
          value={inputDeviceId}
          onChange={(e) => setInputDeviceId(e.target.value)}
          className="settings-select"
          // Activate mic on first interaction to ensure permissions are requested
          onClick={activateLocalStream}
        >
          {inputDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `microphone ${inputDevices.indexOf(device) + 1}`}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-group">
        <label htmlFor="mic-volume">마이크 볼륨</label>
        <input
          id="mic-volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={micVolume}
          onChange={(e) => setMicVolume(parseFloat(e.target.value))}
          className="settings-slider"
        />
        <span>{Math.round(micVolume * 100)}%</span>
      </div>

      <div className="settings-group">
        <label htmlFor="speaker-select">스피커</label>
        <select
          id="speaker-select"
          value={outputDeviceId}
          onChange={(e) => setOutputDeviceId(e.target.value)}
          className="settings-select"
        >
          {outputDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `speaker ${outputDevices.indexOf(device) + 1}`}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-group">
        <label htmlFor="speaker-volume">스피커 볼륨</label>
        <input
          id="speaker-volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={speakerVolume}
          onChange={(e) => setSpeakerVolume(parseFloat(e.target.value))}
          className="settings-slider"
        />
        <span>{Math.round(speakerVolume * 100)}%</span>
      </div>

      <div className="settings-group">
        <label htmlFor="bitrate-select">오디오 품질 (Bitrate)</label>
        <select
          id="bitrate-select"
          value={audioBitrate}
          onChange={(e) => setAudioBitrate(Number(e.target.value))}
          className="settings-select"
        >
          {bitrateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-group settings-group-toggle">
        <label htmlFor="mic-loopback">내 목소리 듣기</label>
        <label className="switch">
          <input
            id="mic-loopback"
            type="checkbox"
            checked={isMicLoopbackEnabled}
            onChange={(e) => setIsMicLoopbackEnabled(e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
      </div>

      {/* Hidden audio element for loopback */}
      {isMicLoopbackEnabled && (
        <audio
          ref={(el) => {
            if (el && useWebRTC().localStream) {
              el.srcObject = useWebRTC().localStream;
              el.play().catch(e => console.error("Loopback play error:", e));
            }
          }}
          autoPlay
          muted={false} // Must be unmuted to hear yourself
          volume={speakerVolume} // Use speaker volume setting
        />
      )}
    </div>
  );
};

export default AudioSettings;
