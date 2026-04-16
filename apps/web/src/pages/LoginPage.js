import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthPanel from '../components/auth/AuthPanel';
import ToastStack from '../components/layout/ToastStack';
import { login, register } from '../services/authService';

function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'tourist',
  });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const showNotice = (text, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4200);
  };

  const showError = (error) => {
    const apiError = error?.response?.data?.error;
    showNotice(apiError || 'An error occurred.', 'error');
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      await register(registerForm);
      showNotice('Registration successful. You can now log in.', 'success');
      setLoginForm({ email: '', password: '' });
      setRegisterForm({ username: '', email: '', password: '', role: 'tourist' });
    } catch (error) {
      showError(error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const data = await login(loginForm);
      localStorage.setItem('soa_token', data.token);
      localStorage.setItem('soa_user', JSON.stringify(data.user));
      showNotice('Login successful.', 'success');
      onLoginSuccess(data.token, data.user);
      navigate('/home');
    } catch (error) {
      showError(error);
    }
  };

  return (
    <div className="page">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <AuthPanel
        registerForm={registerForm}
        setRegisterForm={setRegisterForm}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        onRegister={handleRegister}
        onLogin={handleLogin}
      />
    </div>
  );
}

export default LoginPage;
