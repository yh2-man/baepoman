import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Changed from useAuthActions
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

// New styled component for the checkbox
const CheckboxContainer = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 0;
    color: var(--text-color-secondary);
    font-size: 0.9rem;

    input {
        margin-right: 0.5rem;
    }
`;

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [keepLoggedIn, setKeepLoggedIn] = useState(true); // State for the checkbox
    const { loginAndSetPersistence } = useAuth(); // Get new function from context

    const handleLogin = (e) => {
        e.preventDefault(); // Prevent form submission
        loginAndSetPersistence(email, password, keepLoggedIn);
    };

    return (
        <Card>
            <form onSubmit={handleLogin}>
                <Title>로그인</Title>
                <div style={{ marginBottom: '1rem' }}>
                    <Input
                        placeholder="이메일"
                        value={email}
                        onChange={(e) => {
                            console.log('[DEBUG] LoginPage: Email input changed to:', e.target.value);
                            setEmail(e.target.value);
                        }}
                        required
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <Input
                        type="password"
                        placeholder="비밀번호"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <CheckboxContainer>
                    <input
                        type="checkbox"
                        id="keep-logged-in"
                        checked={keepLoggedIn}
                        onChange={(e) => setKeepLoggedIn(e.target.checked)}
                    />
                    <label htmlFor="keep-logged-in">로그인 유지</label>
                </CheckboxContainer>
                <Button type="submit" width="100%">
                    로그인
                </Button>
                <StyledLink to="/signup">
                    계정이 없으신가요? 회원가입
                </StyledLink>
            </form>
        </Card>
    );
}

export default LoginPage;