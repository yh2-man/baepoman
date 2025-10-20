import React from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
// import NotificationDisplay from "../../components/common/NotificationDisplay";

const PageContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

const AuthContent = styled.div`
    width: 100%;
    max-width: 28rem; /* 448px */
    padding: 2rem;
    box-sizing: border-box;
`;

function AuthLayout() {
    return (
        <PageContainer>
            <AuthContent>
                <Outlet />
            </AuthContent>
            {/* NotificationDisplay is now part of this persistent layout */}
            {/* <NotificationDisplay /> */}
        </PageContainer>
    );
}

export default AuthLayout;