import React, { useCallback, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';

function App() {
  const [token, setToken] = useState(localStorage.getItem('soa_token') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('soa_user');
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const handleLogout = useCallback((announce = true) => {
    setToken('');
    setUser(null);
    localStorage.removeItem('soa_token');
    localStorage.removeItem('soa_user');
  }, []);

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={!token ? <LoginPage onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/home" />}
        />
        <Route
          path="/home/*"
          element={
            token ? (
              <HomePage token={token} user={user} setUser={setUser} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/" element={<Navigate to={token ? '/home' : '/login'} />} />
      </Routes>
    </Router>
  );
}

export default App;
