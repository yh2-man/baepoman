import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Context and Global Components
import { AuthProvider, useAuth } from './context/AuthContext'; // Import useAuth
import { NotificationProvider } from './context/NotificationContext';
import { ProfileProvider } from './context/ProfileContext';
import { ConfirmationProvider } from './context/ConfirmationContext';
import { WebRTCProvider } from './context/WebRTCContext';
import NotificationDisplay from './components/common/NotificationDisplay';
import AuthLayout from './pages/layouts/AuthLayout';
import AppLayout from './pages/layouts/AppLayout'; // Import AppLayout
import ProtectedRoute from './components/common/ProtectedRoute'; // Import ProtectedRoute

// Pages
import LoginPage from './pages/login/LoginPage';
import SignupPage from './pages/login/SignupPage';
import { LobbyPage } from './pages/lobby/LobbyPage';
import RoomPage from './pages/room/RoomPage'; // Import RoomPage
import SettingsPage from './pages/settings/SettingsPage';
import ProfileSettings from './components/settings/ProfileSettings';

// Removed MainLayout component definition

const AuthRoutes = () => {
  const { user } = useAuth();
  // A user with a valid session (user object exists) should be sent to the lobby,
  // regardless of the transient WebSocket connection status.
  if (user) {
    return <Navigate to="/lobby" replace />;
  }
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
};

function App() {
  return (
    <>
      {/* 2. BrowserRouter가 라우팅이 필요한 모든 것을 감쌉니다. */}
      <BrowserRouter>
        {/* 3. NotificationProvider가 알림 기능을 제공합니다. */}
                  <NotificationProvider>
                    <ConfirmationProvider>
                      <NotificationDisplay /> {/* Render NotificationDisplay here */}
                    {/* 4. AuthProvider가 인증이 필요한 모든 것을 감쌉니다. */}
                    <AuthProvider>
                      <WebRTCProvider>
                        <ProfileProvider>
                        {/* 5. Routes가 실제 페이지 경로를 정의합니다. */}
                        <Routes>              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}> {/* Use AppLayout here */}
                  <Route path="/lobby" element={<LobbyPage />} />
                  <Route path="/room/:roomId" element={<RoomPage />} />
                  <Route path="/settings" element={<SettingsPage />}>
                    <Route index element={<Navigate to="profile" replace />} />
                    <Route path="profile" element={<ProfileSettings />} />
                  </Route>
                </Route>
              </Route>

              {/* Auth routes */}
              <Route element={<AuthRoutes />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
              </Route>

              {/* Redirect any unmatched routes to /login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
                      </ProfileProvider>
                      </WebRTCProvider>
          </AuthProvider>
                    </ConfirmationProvider>
        </NotificationProvider>
      </BrowserRouter>
    </>
  );
}

export default App;
