import React from 'react';
import PropTypes from 'prop-types';
import './ProfileAvatar.css';

const ProfileAvatar = ({ user, className = '', size = 'medium', isMuted = false }) => {
  if (!user) {
    return <div className={`avatar-placeholder ${className} profile-avatar--${size}`}>?</div>;
  }

  let avatarUrl = null;
  if (user.profile_image_url) {
    // Check if it's a data URL (for local preview) or a relative server path
    if (user.profile_image_url.startsWith('data:')) {
      avatarUrl = user.profile_image_url;
    } else {
      avatarUrl = `http://localhost:3001${user.profile_image_url}`;
    }
  }

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

