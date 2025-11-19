import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import Button from '../common/Button';
import './ThemeSettings.css'; // We'll create this file for specific styling

const ThemeSettings = () => {
  const { theme, changeTheme } = useTheme();

  return (
    <div className="theme-settings-panel">
      <div className="theme-settings-container">
        <h2>테마 설정</h2>
        <p>앱의 전체적인 모양과 느낌을 변경합니다.</p>
        <div className="theme-options">
          <Button 
            onClick={() => changeTheme('theme-default')}
            variant={theme === 'theme-default' ? 'primary' : 'secondary'}
          >
            다크 모드
          </Button>
          <Button 
            onClick={() => changeTheme('theme-light')}
            variant={theme === 'theme-light' ? 'primary' : 'secondary'}
          >
            라이트 모드
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;
