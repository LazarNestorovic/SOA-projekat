import React, { useEffect, useState } from 'react';
import { blockUser, getUsers } from '../../services/stakeholderService';

function AdminPanel({ token, active, isAdmin, onNotice, onError }) {
  const [users, setUsers] = useState([]);

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
    try {
      await blockUser(token, id);
      const data = await getUsers(token);
      setUsers(data.users || []);
      onNotice('Account blocked.', 'success');
    } catch (error) {
      onError(error);
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
        {users.map((userItem) => (
          <div className="user-row" key={userItem.id}>
            <span>
              {userItem.username} ({userItem.email}) | Role: {userItem.role}
            </span>
            <button type="button" onClick={() => handleBlock(userItem.id)}>Block</button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AdminPanel;
