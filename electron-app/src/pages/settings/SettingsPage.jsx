import React from 'react';
import { Outlet } from 'react-router-dom';
import './SettingsPage.css';

const SettingsPage = () => {
  return (
    <div className="settings-page-layout">
      <Outlet />
    </div>
  );
};

export default SettingsPage;
