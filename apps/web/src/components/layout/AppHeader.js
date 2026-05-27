import React from 'react';
import { useNavigate } from 'react-router-dom';

function AppHeader({ user, onLogout }) {
	const navigate = useNavigate();

	return (
		<header className="hero">
			<div className="hero-content">
				<p className="hero-kicker">SOA Travel Network</p>
				<h1>Discover stories before you travel.</h1>
				<p className="hero-subtitle">
					A place for guide profiles, local blogs and tourist experiences in one
					organized space.
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
					{user.role === 'tourist' && (
						<p style={{ margin: 0, fontSize: '14px' }}>
							<span className="session-label">Balans: </span>
							<strong style={{ color: '#0d9488' }}>
								€{Number(user.balance ?? 0).toFixed(2)}
							</strong>
						</p>
					)}
					{['author', 'admin', 'guide'].includes(user.role) && (
						<button
							type="button"
							className="primary"
							onClick={() => navigate('/home/tour-editor')}
							style={{ marginBottom: '8px' }}>
							Kreiraj turu
						</button>
					)}
					<button type="button" className="ghost" onClick={onLogout}>
						Log Out
					</button>
				</div>
			) : null}
		</header>
	);
}

export default AppHeader;
