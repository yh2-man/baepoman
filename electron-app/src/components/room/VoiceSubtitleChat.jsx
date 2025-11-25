import React, { useEffect, useState, useRef } from 'react';
import { useWebRTC } from '../../context/WebRTCContext';
import './VoiceSubtitleChat.css';
import WhisperWorker from '../../workers/whisper.worker.js?worker';

const VoiceSubtitleChat = () => {
  const { localStream } = useWebRTC();
  const [subtitles, setSubtitles] = useState([]);
  const [status, setStatus] = useState('Idle'); // Idle, Loading, Ready, Error
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isEnabled, setIsEnabled] = useState(false);

  const workerRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);

  // VAD Refs
  const speechBufferRef = useRef([]);
  const isSpeakingRef = useRef(false);
  const silenceStartRef = useRef(null);

  useEffect(() => {
    // Initialize Worker
    workerRef.current = new WhisperWorker();

    workerRef.current.onmessage = (event) => {
      const { status, data, progress, text } = event.data;

      if (status === 'loading') {
        setStatus('Loading Model...');
      } else if (status === 'downloading') {
        setStatus(`Downloading Model... ${Math.round(progress)}%`);
        setDownloadProgress(progress);
      } else if (status === 'ready') {
        setStatus('Ready');
        setDownloadProgress(100);
      } else if (status === 'result') {
        if (text && text.trim()) {
          setSubtitles(prev => [...prev, text]);
        }
      } else if (status === 'error') {
        console.error('Whisper Worker Error:', data);
        setStatus(`Error: ${data}`);
        setIsEnabled(false);
      }
    };

    return () => {
      workerRef.current.terminate();
    };
  }, []);

  const handleStart = () => {
    setIsEnabled(true);
    if (status === 'Idle') {
      workerRef.current.postMessage({ type: 'load' });
    }
  };

  const handleStop = () => {
    setIsEnabled(false);
    // Don't terminate worker, just stop sending audio
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Audio Capture Effect
  useEffect(() => {
    if (!isEnabled || status !== 'Ready' || !localStream) return;

    try {
      // Whisper expects 16kHz audio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(localStream);
      sourceRef.current = source;

      // Buffer size 4096 is standard
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const audioData = new Float32Array(inputData);

        // 1. Calculate RMS (Volume)
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
          sum += audioData[i] * audioData[i];
        }
        const rms = Math.sqrt(sum / audioData.length);
        const THRESHOLD = 0.02; // Adjust based on mic sensitivity

        // 2. VAD Logic
        if (rms > THRESHOLD) {
          // Speech detected
          isSpeakingRef.current = true;
          silenceStartRef.current = null;
          speechBufferRef.current.push(audioData);
        } else {
          // Silence detected
          if (isSpeakingRef.current) {
            // We were speaking, now silent
            if (!silenceStartRef.current) {
              silenceStartRef.current = Date.now();
              speechBufferRef.current.push(audioData); // Keep buffering briefly
            } else if (Date.now() - silenceStartRef.current > 800) {
              // Silence > 800ms -> End of sentence -> Flush
              if (speechBufferRef.current.length > 0) {
                // Merge chunks
                const totalLength = speechBufferRef.current.reduce((acc, val) => acc + val.length, 0);
                const merged = new Float32Array(totalLength);
                let offset = 0;
                for (const chunk of speechBufferRef.current) {
                  merged.set(chunk, offset);
                  offset += chunk.length;
                }

                // Send to worker if long enough (> 0.5s)
                if (totalLength > 16000 * 0.5) {
                  workerRef.current.postMessage({
                    type: 'transcribe',
                    audio: merged
                  });
                }

                speechBufferRef.current = [];
              }
              isSpeakingRef.current = false;
              silenceStartRef.current = null;
            } else {
              // Still in silence window (pause between words), keep buffering
              speechBufferRef.current.push(audioData);
            }
          }
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (e) {
      console.error("Audio Setup Error:", e);
      setStatus('Audio Setup Error');
    }

    return () => {
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [isEnabled, status, localStream]);

  // Auto-scroll
  const contentRef = useRef(null);
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [subtitles]);

  return (
    <div className="voice-subtitle-chat">
      <div className="subtitle-header">
        <h3>음성 자막 채팅 (Whisper)</h3>
        {!isEnabled ? (
          <button className="start-btn" onClick={handleStart}>자막 시작</button>
        ) : (
          <button className="stop-btn" onClick={handleStop}>자막 중지</button>
        )}
      </div>
      <p className="status-message">{status}</p>
      {status.includes('Downloading') && (
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${downloadProgress}%` }}></div>
        </div>
      )}
      <div className="subtitle-content" ref={contentRef}>
        {subtitles.length === 0 ? (
          <p className="placeholder">
            {status === 'Ready' ? '말씀하시면 자막이 표시됩니다...' : '자막 시작 버튼을 눌러주세요.'}
          </p>
        ) : (
          subtitles.map((text, index) => (
            <p key={index} className="subtitle-text">{text}</p>
          ))
        )}
      </div>
    </div>
  );
};

export default VoiceSubtitleChat;
