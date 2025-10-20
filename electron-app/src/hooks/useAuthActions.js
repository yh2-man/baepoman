import { useAuth } from '../context/AuthContext';

export function useAuthActions() {
    const { isConnected, sendMessage } = useAuth();

    const login = (email, password) => {
        if (isConnected) {
            sendMessage({ type: 'login', payload: { email, password } });
        }
    };

    const signup = (username, email, password) => {
        if (isConnected) {
            sendMessage({ type: 'signup', payload: { username, email, password } });
        }
    };

    const verifyEmail = (email, code) => {
        if (isConnected) {
            sendMessage({ type: 'verify-email', payload: { email, code } });
        }
    };
    
    return { login, signup, verifyEmail };
}