import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Header.css';

const Header = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div className="header-section header-left">
        <span className="header-logo" onClick={() => navigate('/lobby')}>
          Voice App
        </span>
      </div>
      <div className="header-section header-center">
        <div className="header-ad-space">
          (광고 영역)
        </div>
      </div>
      <div className="header-section header-right">
        {user && (
          <div className="settings-icon" onClick={() => navigate('/settings')} title="설정">
            ⚙️
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
