import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import './SettingsPage.css';

const SettingsPage = () => {
  const { logout } = useAuth();

  return (
    <div className="settings-page-layout">
      <aside className="settings-sidebar">
        <nav className="settings-nav">
          <NavLink 
            to="/settings/profile" 
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
          >
            프로필
          </NavLink>
          <NavLink 
            to="/settings/audio" 
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
          >
            오디오
          </NavLink>
          <NavLink 
            to="/settings/theme" 
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
          >
            테마
          </NavLink>
        </nav>
        <div className="logout-section">
          <Button onClick={logout} variant="danger" width="100%">
            로그아웃
          </Button>
        </div>
      </aside>
      <main className="settings-content custom-scrollbar">
        <Outlet />
      </main>
    </div>
  );
};

export default SettingsPage;
