import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const AudioSettingsContext = createContext();

export const useAudioSettings = () => useContext(AudioSettingsContext);

export const AudioSettingsProvider = ({ children }) => {
  const [inputDevices, setInputDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);

  const [inputDeviceId, setInputDeviceId] = useState('default');
  const [outputDeviceId, setOutputDeviceId] = useState('default');

  const [micVolume, setMicVolume] = useState(1); // 0 to 1
  const [speakerVolume, setSpeakerVolume] = useState(1); // 0 to 1

  const [isMicLoopbackEnabled, setIsMicLoopbackEnabled] = useState(false);
  const [audioBitrate, setAudioBitrate] = useState(32000);

  useEffect(() => {
    const getDevices = async () => {
      try {
        // Debug: Check what devices are visible before permission
        const initialDevices = await navigator.mediaDevices.enumerateDevices();
        console.log('Initial device list:', initialDevices);

        // Request permission
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('Post-permission device list:', devices);

        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
        const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');

        setInputDevices(audioInputDevices);
        setOutputDevices(audioOutputDevices);
      } catch (error) {
        console.error('Error enumerating audio devices:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
      }
    };

    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, []);

  const value = {
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
  };

  return (
    <AudioSettingsContext.Provider value={value}>
      {children}
    </AudioSettingsContext.Provider>
  );
};

AudioSettingsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
