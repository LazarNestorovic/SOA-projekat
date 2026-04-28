import React from 'react';

function AuthPanel({ registerForm, setRegisterForm, loginForm, setLoginForm, onRegister, onLogin }) {
  return (
    <section className="auth-layout">
      <article className="card">
        <h2>Register</h2>
        <p className="meta">Available roles: guide and tourist</p>
        <form onSubmit={onRegister}>
          <input
            placeholder="Username"
            value={registerForm.username}
            onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
          />
          <input
            placeholder="Email"
            value={registerForm.email}
            onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
          />
          <input
            placeholder="Password"
            type="password"
            value={registerForm.password}
            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
          />
          <select
            value={registerForm.role}
            onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}
          >
            <option value="guide">Guide</option>
            <option value="tourist">Tourist</option>
          </select>
          <button type="submit">Register Account</button>
        </form>
      </article>

      <article className="card">
        <h2>Login</h2>
        <form onSubmit={onLogin}>
          <input
            placeholder="Email"
            value={loginForm.email}
            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
          />
          <input
            placeholder="Password"
            type="password"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
          />
          <button type="submit">Log In</button>
        </form>
      </article>
    </section>
  );
}

export default AuthPanel;
