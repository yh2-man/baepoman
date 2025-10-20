import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useAuthActions } from '../../hooks/useAuthActions';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import styled from 'styled-components';

const Title = styled.h1`
    text-align: center;
    margin: 0 0 1.5rem 0;
`;

const StyledLink = styled(Link)`
    color: var(--primary-color);
    text-decoration: none;
    margin-top: 1rem;
    display: block;
    text-align: center;
`;

function SignupPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [code, setCode] = useState('');
    const [uiState, setUiState] = useState('initial'); // 'initial', 'codeSent'

    const navigate = useNavigate();
    const { addMessageListener, removeMessageListener } = useAuth();
    const { addNotification } = useNotification();
    const { signup, verifyEmail } = useAuthActions();

    // This effect handles UI changes and navigation based on WebSocket events.
    // Global notifications for these events are handled in AuthContext.
    useEffect(() => {
        const handleNeedsVerification = () => {
            setUiState('codeSent');
        };
        
        const handleVerificationSuccess = (payload) => {
            // Navigate to login page with a success message to be displayed there
            navigate('/', { state: { message: payload.message, type: 'success' } });
        };

        addMessageListener('signup-needs-verification', handleNeedsVerification);
        addMessageListener('email-verification-success', handleVerificationSuccess);

        return () => {
            removeMessageListener('signup-needs-verification', handleNeedsVerification);
            removeMessageListener('email-verification-success', handleVerificationSuccess);
        };
    }, [addMessageListener, removeMessageListener, navigate]);

    const validateSignupForm = (username, email, password, confirmPassword, addNotification) => {
        if (!username.trim()) {
            addNotification('사용자 이름을 입력해주세요.', 'error');
            return false;
        }
        if (!email.trim()) {
            addNotification('이메일을 입력해주세요.', 'error');
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            addNotification('유효한 이메일 주소를 입력해주세요.', 'error');
            return false;
        }
        if (password.length < 6) { // Example: minimum password length
            addNotification('비밀번호는 최소 6자 이상이어야 합니다.', 'error');
            return false;
        }
        if (password !== confirmPassword) {
            addNotification('비밀번호가 일치하지 않습니다.', 'error');
            return false;
        }
        return true;
    };

    const handleRequestCode = (e) => {
        e.preventDefault();
        if (!validateSignupForm(username, email, password, confirmPassword, addNotification)) {
            return;
        }
        signup(username, email, password);
    };

    const handleVerifyAndSignup = (e) => {
        e.preventDefault();
        if (!code || code.length !== 6) {
            addNotification('6자리 인증 코드를 입력하세요.', 'error');
            return;
        }
        verifyEmail(email, code);
    };

    return (
        <Card>
            <form onSubmit={uiState === 'initial' ? handleRequestCode : handleVerifyAndSignup}>
                <Title>회원가입</Title>
                <div style={{ marginBottom: '1rem' }}>
                    <Input
                        placeholder="사용자 이름"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={uiState === 'codeSent'}
                        required
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <Input
                        placeholder="이메일"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={uiState === 'codeSent'}
                        required
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <Input
                        type="password"
                        placeholder="비밀번호"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={uiState === 'codeSent'}
                        required
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <Input
                        type="password"
                        placeholder="비밀번호 확인"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={uiState === 'codeSent'}
                        required
                    />
                </div>

                {uiState === 'codeSent' && (
                    <div style={{ marginBottom: '1rem' }}>
                        <Input
                            placeholder="이메일로 전송된 6자리 코드"
                            value={code}
                            onChange={(e) => setCode(e.target.value.trim())}
                            maxLength="6"
                            required
                        />
                    </div>
                )}

                <Button type="submit">
                    {uiState === 'initial' ? '인증 코드 요청' : '회원가입'}
                </Button>
                <StyledLink to="/">
                    이미 계정이 있으신가요? 로그인
                </StyledLink>
            </form>
        </Card>
    );
}

export default SignupPage;