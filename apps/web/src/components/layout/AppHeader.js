import React from 'react';

function AppHeader({ user, onLogout }) {
  return (
    <header className="hero">
      <div className="hero-content">
        <p className="hero-kicker">SOA Travel Network</p>
        <h1>Discover stories before you travel.</h1>
        <p className="hero-subtitle">
          A place for guide profiles, local blogs and tourist experiences in one organized space.
        </p>
        <div className="hero-tags">
          <span>Guides</span>
          <span>Experiences</span>
          <span>Community</span>
        </div>
      </div>

      {user ? (
        <div className="session-card">
          <p className="session-label">Active Session</p>
          <p className="session-user">
            <strong>{user.username}</strong> ({user.role})
          </p>
          <button type="button" className="ghost" onClick={onLogout}>
            Log Out
          </button>
        </div>
      ) : null}
    </header>
  );
}

export default AppHeader;
