import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConfirmation } from '../../context/ConfirmationContext'; // Import useConfirmation
import './SettingsPanel.css';

const SettingsPanel = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { confirmAction } = useConfirmation(); // Get confirmAction function

  const handleSettingClick = (path) => {
    navigate(`/settings/${path}`);
  };

  const handleLogoutClick = () => {
    confirmAction('정말 로그아웃 하시겠습니까?', logout);
  };

  return (
    <div className="settings-panel">
      <div> {/* Wrapper for scrollable settings */}
        <h3 className="settings-panel-header">설정</h3>
        <ul className="settings-list">
          <li onClick={() => handleSettingClick('profile')}>
            프로필 설정
          </li>
          <li onClick={() => handleSettingClick('audio')}>
            오디오 설정
          </li>
          <li onClick={() => handleSettingClick('theme')}>
            테마 설정
          </li>
          {/* Add more settings later */}
        </ul>
      </div>
      <div className="settings-panel-footer"> {/* Footer for logout */}
        <div className="logout-button" onClick={handleLogoutClick}>
          로그아웃
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
