const db = require('../db/Db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require('../utils/EmailService');

async function handleLogin(ws, { email, password }) {
    console.log(`[DEBUG] Server: handleLogin called with email: ${email}`); // New log
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        console.log(`[DEBUG] Server: DB query for email ${email} returned ${result.rows.length} rows.`); // New log

        if (result.rows.length === 0) {
            ws.send(JSON.stringify({ type: 'login-failure', payload: { message: '사용자를 찾을 수 없거나 인증되지 않았습니다.' } }));
            return;
        }

        const user = result.rows[0];

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            ws.send(JSON.stringify({ type: 'login-failure', payload: { message: '비밀번호가 올바르지 않습니다.' } }));
            return;
        }

        // --- User is authenticated, generate JWT ---
        const tokenPayload = { id: user.id, username: user.username };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Attach user info to WebSocket connection
        ws.userId = user.id;
        ws.username = user.username;

        // Send success response with user object and token
        ws.send(JSON.stringify({
            type: 'login-success',
            payload: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    profile_image_url: user.profile_image_url
                },
                token: token
            }
        }));

    } catch (error) {
        console.error('Login error:', error);
        ws.send(JSON.stringify({ type: 'login-failure', payload: { message: '로그인 중 오류가 발생했습니다.' } }));
    }
}

async function handleSignup(ws, { username, email, password }) {
    try {
        if (!email || !email.trim()) {
            ws.send(JSON.stringify({ type: 'signup-failure', payload: { message: '이메일 주소를 입력해주세요.' } }));
            return;
        }

        // 1. Check if a VERIFIED user with this email already exists.
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            ws.send(JSON.stringify({ type: 'signup-failure', payload: { message: '이미 인증된 계정에서 사용 중인 이메일입니다.' } }));
            return;
        }

        // 2. Hash password and prepare verification data
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const verificationCode = crypto.randomInt(100000, 1000000).toString();
        const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // 3. Insert or update the pending verification record.
        // This handles both new signups and re-requests for the same email.
        const query = `
            INSERT INTO pending_verifications (email, username, password_hash, code, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE SET
                username = EXCLUDED.username,
                password_hash = EXCLUDED.password_hash,
                code = EXCLUDED.code,
                expires_at = EXCLUDED.expires_at;
        `;
        await db.query(query, [email, username, hashedPassword, verificationCode, codeExpiresAt]);

        // 4. Send email in the background
        sendVerificationEmail(email, verificationCode);

        // 5. Respond to client
        ws.send(JSON.stringify({
            type: 'signup-needs-verification',
            payload: { message: '인증 코드가 이메일로 전송되었습니다.' }
        }));

    } catch (error) {
        console.error('Signup error:', error);
        ws.send(JSON.stringify({ type: 'signup-failure', payload: { message: '회원가입 중 오류가 발생했습니다.' } }));
    }
}

async function handleUpdateProfile(ws, payload) {
    // Use the userId from the authenticated WebSocket session
    const userId = ws.userId;
    if (!userId) {
        return ws.send(JSON.stringify({ type: 'update-profile-failure', payload: { message: '사용자 인증이 필요합니다.' } }));
    }

    const { newUsername, currentPassword, newPassword } = payload;

    try {
        // --- Handle Username Change ---
        if (newUsername) {
            // Optional: Add validation for username format
            if (newUsername.length < 3) {
                return ws.send(JSON.stringify({ type: 'update-profile-failure', payload: { message: '닉네임은 3자 이상이어야 합니다.' } }));
            }

            // Check if username is already taken by another user
            const existingUser = await db.query('SELECT id FROM users WHERE username = $1 AND id != $2', [newUsername, userId]);
            if (existingUser.rows.length > 0) {
                return ws.send(JSON.stringify({ type: 'update-profile-failure', payload: { message: '이미 사용 중인 닉네임입니다.' } }));
            }

            await db.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, userId]);
            ws.username = newUsername; // Update username on ws object
            ws.send(JSON.stringify({ type: 'update-profile-success', payload: { message: '닉네임이 성공적으로 변경되었습니다.', user: { username: newUsername } } }));
        }

        // --- Handle Password Change ---
        if (newPassword) {
            if (!currentPassword) {
                return ws.send(JSON.stringify({ type: 'update-profile-failure', payload: { message: '현재 비밀번호를 입력해주세요.' } }));
            }

            const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) {
                return ws.send(JSON.stringify({ type: 'update-profile-failure', payload: { message: '사용자를 찾을 수 없습니다.' } }));
            }

            const { password_hash } = userResult.rows[0];
            const isMatch = await bcrypt.compare(currentPassword, password_hash);

            if (!isMatch) {
                return ws.send(JSON.stringify({ type: 'update-profile-failure', payload: { message: '현재 비밀번호가 일치하지 않습니다.' } }));
            }

            const saltRounds = 10;
            const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

            await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHashedPassword, userId]);
            ws.send(JSON.stringify({ type: 'update-profile-success', payload: { message: '비밀번호가 성공적으로 변경되었습니다.' } }));
        }

    } catch (error) {
        console.error('Update profile error:', error);
        ws.send(JSON.stringify({ type: 'update-profile-failure', payload: { message: '프로필 업데이트 중 오류가 발생했습니다.' } }));
    }
}

module.exports = { handleLogin, handleSignup, handleUpdateProfile };
