import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import './ParticipantContextMenu.css';
import { useWebRTC } from '../../context/WebRTCContext'; // Import useWebRTC hook

const ParticipantContextMenu = forwardRef(({
  x,
  y,
  onClose,
  targetParticipantId,
  isCurrentUserHost,
  onKick,
  currentUserId,
}, ref) => {
  const { peerVolumes, setPeerVolume } = useWebRTC(); // Get volume controls from context

  if (!x || !y) return null; // Don't render if position is not set

  // Determine if the kick option should be shown
  const canKick = isCurrentUserHost && targetParticipantId !== currentUserId;
  const showVolumeControl = targetParticipantId && targetParticipantId !== currentUserId;
  
  const handleKickClick = (e) => {
    e.stopPropagation(); // Prevent menu from closing immediately
    onKick(targetParticipantId);
    onClose();
  };

  const handleVolumeChange = (e) => {
    e.stopPropagation(); // Prevent menu from closing
    const volume = parseFloat(e.target.value);
    setPeerVolume(targetParticipantId, volume);
  };

  const currentVolume = peerVolumes[targetParticipantId] ?? 1;

  // Set a CSS variable for the volume percentage
  const sliderStyle = {
    '--volume-percent': `${currentVolume * 100}%`,
  };

  // Stop propagation on the menu itself to prevent immediate closure from the global listener
  const handleMenuClick = (e) => e.stopPropagation();

  return (
    <div className="context-menu" style={{ top: y, left: x }} ref={ref} onClick={handleMenuClick}>
      {canKick && (
        <div className="context-menu-item" onClick={handleKickClick}>
          강퇴
        </div>
      )}

      {showVolumeControl && (
        <div className="context-menu-item volume-control">
          <label htmlFor={`volume-${targetParticipantId}`}>음량</label>
          <input
            type="range"
            className="volume-slider" // Add a class for specific styling
            id={`volume-${targetParticipantId}`}
            min="0"
            max="1"
            step="0.05"
            value={currentVolume}
            style={sliderStyle} // Apply the CSS variable
            onChange={handleVolumeChange}
            onClick={(e) => e.stopPropagation()} // Also stop propagation here
          />
        </div>
      )}

      {!canKick && !showVolumeControl && (
        <div className="context-menu-item-disabled">옵션 없음</div>
      )}
    </div>
  );
});

ParticipantContextMenu.displayName = 'ParticipantContextMenu';

ParticipantContextMenu.propTypes = {
  x: PropTypes.number,
  y: PropTypes.number,
  onClose: PropTypes.func.isRequired,
  targetParticipantId: PropTypes.string,
  isCurrentUserHost: PropTypes.bool.isRequired,
  onKick: PropTypes.func.isRequired,
  currentUserId: PropTypes.string,
};

export default ParticipantContextMenu;
