import React, { useEffect, useState } from 'react';
import { blockUser, getUsers } from '../../services/stakeholderService';

function AdminPanel({ token, active, isAdmin, onNotice, onError }) {
  const [users, setUsers] = useState([]);
  const [blockingById, setBlockingById] = useState({});

  useEffect(() => {
    if (!active || !isAdmin) return;

    const loadUsers = async () => {
      try {
        const data = await getUsers(token);
        setUsers(data.users || []);
      } catch (error) {
        onError(error);
      }
    };

    loadUsers();
  }, [active, isAdmin, token, onError]);

  const handleBlock = async (id) => {
    if (blockingById[id]) return;

    setBlockingById((prev) => ({ ...prev, [id]: true }));

    try {
      await blockUser(token, id);
      const data = await getUsers(token);
      setUsers(data.users || []);
      onNotice('Account blocked.', 'success');
    } catch (error) {
      onError(error);
    } finally {
      setBlockingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (!isAdmin) {
    return (
      <section className="card panel">
        <h2>Admin Panel</h2>
        <p className="meta">Only administrators can view and block user accounts.</p>
      </section>
    );
  }

  return (
    <section className="card panel">
      <div className="panel-head">
        <h2>Admin Panel</h2>
      </div>

      <div className="users">
        {(users || []).map((userItem) => {
          const role = userItem.role;
          const isBlockableRole = role === 'tourist' || role === 'guide';
          const isBlocked = Boolean(userItem.blocked ?? userItem.Blocked);
          const isBlocking = Boolean(blockingById[userItem.id]);

          return (
            <div className="user-row" key={userItem.id}>
              <span>
                {userItem.username} ({userItem.email}) | Role: {role}
              </span>

              {isBlockableRole ? (
                <button
                  type="button"
                  onClick={() => handleBlock(userItem.id)}
                  disabled={isBlocked || isBlocking}
                  aria-disabled={isBlocked || isBlocking}
                  title={isBlocked ? 'This account is already blocked.' : undefined}
                >
                  {isBlocked ? 'Blocked' : isBlocking ? 'Blocking…' : 'Block'}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default AdminPanel;
