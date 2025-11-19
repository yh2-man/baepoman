import React from 'react';
import PropTypes from 'prop-types';
import './ProfileAvatar.css';

const ProfileAvatar = ({ user, className = '', size = 'medium', isMuted = false }) => {
  if (!user) {
    return <div className={`avatar-placeholder ${className} profile-avatar--${size}`}>?</div>;
  }

  // The server is now responsible for sending the full, absolute URL.
  const avatarUrl = user.profile_image_url || null;

  const sizeClass = `profile-avatar--${size}`;

  return (
    <div className={`profile-avatar ${className} ${sizeClass}`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={user.username} className="avatar-img" />
      ) : (
        <div className="avatar-placeholder">{user.username.charAt(0).toUpperCase()}</div>
      )}
      {isMuted && <div className="mute-indicator">🔇</div>}
    </div>
  );
};

ProfileAvatar.propTypes = {
  user: PropTypes.shape({
    username: PropTypes.string,
    profile_image_url: PropTypes.string,
  }),
  className: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  isMuted: PropTypes.bool,
};

export default ProfileAvatar;

