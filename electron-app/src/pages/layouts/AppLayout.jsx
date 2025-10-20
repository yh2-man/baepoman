import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../../components/header/Header';
import Footer from '../../components/common/Footer';
import FriendsPanel from '../../components/friends/FriendsPanel';
import SettingsPanel from '../../components/settings/SettingsPanel';
import GlobalAudioStreams from '../../components/common/GlobalAudioStreams'; // Import GlobalAudioStreams
import './AppLayout.css'; // Import AppLayout.css

const AppLayout = () => {
  const location = useLocation();
  const isSettingsPage = location.pathname.startsWith('/settings');

  return (
    <div className="app-container">
      <Header />
      <div className="main-content-with-friends">
        {isSettingsPage ? <SettingsPanel /> : <FriendsPanel />}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <Footer />
      <GlobalAudioStreams /> {/* Render GlobalAudioStreams here */}
    </div>
  );
};

export default AppLayout;
