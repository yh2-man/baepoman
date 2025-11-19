import { useAuth } from '../context/AuthContext';

export function useAuthActions() {
    const { isConnected, sendMessage, connect } = useAuth();

    const login = (email, password) => {
        if (isConnected) {
            sendMessage({ type: 'login', payload: { email, password } });
        }
    };

    const signup = (username, email, password) => {
        // Ensure connection is active before sending message
        connect(); 
        // A small delay is needed as the connection is not instant
        setTimeout(() => {
            sendMessage({ type: 'signup', payload: { username, email, password } });
        }, 100);
    };

    const verifyEmail = (email, code) => {
        if (isConnected) {
            sendMessage({ type: 'verify-email', payload: { email, code } });
        }
    };
    
    return { login, signup, verifyEmail };
}