import { useState } from 'react'
import { createContext } from 'react'
import { useContext } from 'react'

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [client, setClient] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginFailed, setLoginFailed] = useState(false);
    const [user, setUser] = useState(null);

    const value = {
        client,
        setClient,
        isAuthenticated,
        setIsAuthenticated,
        loginFailed,
        setLoginFailed,
        user,
        setUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
  return useContext(AuthContext);
}

