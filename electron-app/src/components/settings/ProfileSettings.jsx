import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import Input from '../common/Input';
import Button from '../common/Button';
import ProfileAvatar from '../common/ProfileAvatar'; // Use ProfileAvatar for display
import './ProfileSettings.css';

const ProfileSettings = () => {
    const { user, token, sendMessage, updateUser } = useAuth();
    const { addNotification } = useNotification();

    const [username, setUsername] = useState(user?.username || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [previewDataUrl, setPreviewDataUrl] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewDataUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveChanges = async () => {
        let changesMade = false;

        // 1. Handle Image Upload
        if (profileImageFile) {
            changesMade = true;
            const formData = new FormData();
            formData.append('profileImage', profileImageFile);

            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload/profile-image`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.message || '이미지 업로드에 실패했습니다.');

                updateUser({ profile_image_url: data.imageUrl });
                setPreviewDataUrl(null); // Clear local preview after successful upload
                setProfileImageFile(null);
                addNotification('프로필 이미지가 업데이트되었습니다.', 'success');

            } catch (error) {
                addNotification(error.message, 'error');
            }
        }

        // 2. Handle Username Change
        if (username && username !== user.username) {
            changesMade = true;
            // Removed optimistic update. AuthContext will update UI upon server success.
            sendMessage({ type: 'update-profile', payload: { newUsername: username } });
        }

        // 3. Handle Password Change
        if (newPassword) {
            if (newPassword.length < 6) {
                addNotification('새 비밀번호는 6자 이상이어야 합니다.', 'error');
                return;
            }
            if (newPassword !== confirmNewPassword) {
                addNotification('새 비밀번호가 일치하지 않습니다.', 'error');
                return;
            }
            changesMade = true;
            sendMessage({ 
                type: 'update-profile', 
                payload: { currentPassword, newPassword } 
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        }

        if (!changesMade) {
            addNotification('변경사항이 없습니다.', 'info');
        }
    };

    // Create a temporary user object for previewing the new image
    const previewUser = previewDataUrl ? { ...user, profile_image_url: previewDataUrl } : user;

    return (
        <div className="profile-settings-container">
            <h3>프로필 설정</h3>

            <div className="form-section profile-picture-section">
                <ProfileAvatar user={previewUser} size="large" />
                <div className="profile-picture-actions">
                    <label htmlFor="profile-image-upload">프로필 사진 변경</label>
                    <Input 
                        type="file" 
                        id="profile-image-upload"
                        accept="image/png, image/jpeg"
                        onChange={handleImageChange} 
                    />
                </div>
            </div>

            <div className="form-section">
                <Input
                    label="닉네임"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
            </div>

            {user?.last_seen_at && (
                <div className="form-section">
                    <label>마지막 접속 시간</label>
                    <p>{new Date(user.last_seen_at).toLocaleString()}</p>
                </div>
            )}

            <div className="form-section">
                <h4>비밀번호 변경</h4>
                <div className="password-fields">
                    <Input
                        type="password"
                        label="현재 비밀번호"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="현재 비밀번호를 입력하세요"
                    />
                    <Input
                        type="password"
                        label="새 비밀번호"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="새 비밀번호 (6자 이상)"
                    />
                    <Input
                        type="password"
                        label="새 비밀번호 확인"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="새 비밀번호를 다시 입력하세요"
                    />
                </div>
            </div>

            <div className="save-button-container">
                <Button onClick={handleSaveChanges}>변경사항 저장</Button>
            </div>
        </div>
    );
};

export default ProfileSettings;
