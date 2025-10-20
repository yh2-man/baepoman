import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendVerificationEmail = async (to, code) => {
    if (!to || to.trim() === '') {
        throw new Error('sendVerificationEmail: Recipient email address (to) is missing or empty.');
    }

    const mailOptions = {
        from: process.env.EMAIL_USER, // Simplified from address
        to: to,
        subject: 'OurChat 인증코드',
        html: `
            <div style="font-family: sans-serif; text-align: center; padding: 20px; color: #333;">
                <h2 style="color: #000;">이메일 인증</h2>
                <p>6자리 인증 코드는 다음과 같습니다:</p>
                <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; padding: 10px; background-color: #f0f0f0; border-radius: 5px;">${code}</p>
                <p>이 코드는 10분 후에 만료됩니다.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
                <p style="font-size: 12px; color: #999;">이 요청을 하지 않으셨다면 이 이메일을 무시하셔도 됩니다.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Verification email sent to', to);
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
    }
};
