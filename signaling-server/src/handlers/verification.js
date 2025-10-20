const db = require('../db/Db');

async function handleEmailVerification(ws, { email, code }) {
  try {
    // 1. Find a matching and valid pending verification
    const result = await db.query(
      'SELECT * FROM pending_verifications WHERE email = $1 AND code = $2 AND expires_at > NOW()',
      [email, code]
    );

    if (result.rows.length === 0) {
      ws.send(JSON.stringify({
        type: 'email-verification-failure',
        payload: { message: '인증 코드가 유효하지 않거나 만료되었습니다.' },
      }));
      return;
    }

    const pendingUser = result.rows[0];

    // 2. Create the final user in the 'users' table
    try {
        await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
            [pendingUser.username, pendingUser.email, pendingUser.password_hash]
        );
    } catch (dbError) {
        // This could happen in a race condition if another request verified the same user
        // or if the username was taken in the meantime.
        console.error('Error inserting user, may already exist:', dbError);
        ws.send(JSON.stringify({
            type: 'email-verification-failure',
            payload: { message: '계정이 방금 인증되었을 수 있습니다. 로그인을 시도해 주세요.' },
        }));
        return;
    }


    // 3. Delete the pending verification record
    await db.query('DELETE FROM pending_verifications WHERE email = $1', [email]);

    // 4. Send success response
    ws.send(JSON.stringify({
      type: 'email-verification-success',
      payload: { message: '이메일이 성공적으로 인증되었습니다. 이제 로그인할 수 있습니다.' },
    }));

  } catch (error) {
    console.error('Error during email verification:', error);
    ws.send(JSON.stringify({
      type: 'email-verification-failure',
      payload: { message: '인증 중 오류가 발생했습니다.' },
    }));
  }
}

module.exports = { handleEmailVerification };