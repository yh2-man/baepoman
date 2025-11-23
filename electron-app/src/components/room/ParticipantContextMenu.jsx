import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import './ParticipantContextMenu.css'; // Will create this next

const ParticipantContextMenu = forwardRef(({
  x,
  y,
  onClose,
  targetParticipantId,
  isCurrentUserHost,
  onKick,
  currentUserId,
}, ref) => {
  if (!x || !y) return null; // Don't render if position is not set

  // Determine if the kick option should be shown
  const canKick = isCurrentUserHost && targetParticipantId !== currentUserId;

  const handleKickClick = () => {
    onKick(targetParticipantId);
    onClose();
  };

  return (
    <div className="context-menu" style={{ top: y, left: x }} onClick={onClose} ref={ref}>
      {canKick && (
        <div className="context-menu-item" onClick={handleKickClick}>
          강퇴
        </div>
      )}
      {/* Add other menu items here later */}
      {!canKick && <div className="context-menu-item-disabled">더 많은 옵션</div>}
    </div>
  );
});

ParticipantContextMenu.propTypes = {
  x: PropTypes.number,
  y: PropTypes.number,
  onClose: PropTypes.func.isRequired,
  targetParticipantId: PropTypes.string, // Assuming participant IDs are strings
  isCurrentUserHost: PropTypes.bool.isRequired,
  onKick: PropTypes.func.isRequired,
  currentUserId: PropTypes.string,
};

export default ParticipantContextMenu;
