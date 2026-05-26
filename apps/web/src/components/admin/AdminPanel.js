import React, { useEffect, useState } from 'react';
import { blockUser, getUsers, topUpBalance } from '../../services/stakeholderService';

function AdminPanel({ token, active, isAdmin, onNotice, onError }) {
  const [users, setUsers] = useState([]);
  const [blockingById, setBlockingById] = useState({});
  const [topUpAmounts, setTopUpAmounts] = useState({});
  const [toppingUpById, setToppingUpById] = useState({});

  const loadUsers = async () => {
    try {
      const data = await getUsers(token);
      setUsers(data.users || []);
    } catch (error) {
      onError(error);
    }
  };

  useEffect(() => {
    if (!active || !isAdmin) return;
    loadUsers();
  }, [active, isAdmin, token, onError]); // eslint-disable-line

  const handleBlock = async (id) => {
    if (blockingById[id]) return;
    setBlockingById((prev) => ({ ...prev, [id]: true }));
    try {
      await blockUser(token, id);
      await loadUsers();
      onNotice('Nalog je blokiran.', 'success');
    } catch (error) {
      onError(error);
    } finally {
      setBlockingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleTopUp = async (userId, username) => {
    const amount = parseFloat(topUpAmounts[userId] || '');
    if (!amount || amount <= 0) {
      onNotice('Unesi pozitivan iznos.', 'error');
      return;
    }
    setToppingUpById((prev) => ({ ...prev, [userId]: true }));
    try {
      const result = await topUpBalance(token, userId, amount);
      setTopUpAmounts((prev) => ({ ...prev, [userId]: '' }));
      await loadUsers();
      onNotice(`Balans korisnika "${username}" napunjen za €${amount.toFixed(2)}. Novi balans: €${Number(result.balance).toFixed(2)}`, 'success');
    } catch (error) {
      onError(error);
    } finally {
      setToppingUpById((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (!isAdmin) {
    return (
      <section className="card panel">
        <h2>Admin Panel</h2>
        <p className="meta">Samo administratori mogu upravljati korisnicima.</p>
      </section>
    );
  }

  return (
    <section className="card panel">
      <div className="panel-head">
        <h2 style={{ fontFamily: 'Playfair Display, serif' }}>Admin Panel</h2>
        <button className="ghost" onClick={loadUsers} style={{ minWidth: 90 }}>Osveži</button>
      </div>

      <div className="users">
        {(users || []).map((userItem) => {
          const role = userItem.role;
          const isBlockableRole = role === 'tourist' || role === 'guide';
          const isBlocked = Boolean(userItem.blocked ?? userItem.Blocked);
          const isBlocking = Boolean(blockingById[userItem.id]);
          const isTopping = Boolean(toppingUpById[userItem.id]);
          const balance = Number(userItem.balance ?? 0);

          return (
            <div key={userItem.id} style={{
              border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px',
              background: '#fff', display: 'grid', gap: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{userItem.username}</span>
                  <span className="meta" style={{ marginLeft: 8 }}>{userItem.email}</span>
                  <span style={{
                    marginLeft: 8, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: '#0a6f66', background: 'rgba(13,148,136,0.1)',
                    borderRadius: 999, padding: '2px 8px',
                  }}>{role}</span>
                  {isBlocked && (
                    <span style={{
                      marginLeft: 8, fontSize: '11px', fontWeight: 700, color: '#ef4444',
                      background: 'rgba(239,68,68,0.1)', borderRadius: 999, padding: '2px 8px',
                    }}>BLOKIRAN</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, color: '#0d9488', fontSize: '15px' }}>
                    €{balance.toFixed(2)}
                  </span>
                  {isBlockableRole && (
                    <button
                      type="button"
                      onClick={() => handleBlock(userItem.id)}
                      disabled={isBlocked || isBlocking}
                      style={{
                        background: isBlocked ? '#9ca3af' : 'linear-gradient(120deg,#ef4444,#dc2626)',
                        minWidth: 80,
                      }}
                    >
                      {isBlocked ? 'Blokiran' : isBlocking ? 'Blokiranje...' : 'Blokiraj'}
                    </button>
                  )}
                </div>
              </div>

              {role === 'tourist' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px dashed var(--line)', paddingTop: 10 }}>
                  <span className="meta" style={{ flexShrink: 0 }}>Puni balans:</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Iznos (€)"
                    value={topUpAmounts[userItem.id] || ''}
                    onChange={(e) => setTopUpAmounts((prev) => ({ ...prev, [userItem.id]: e.target.value }))}
                    style={{ width: 120, padding: '6px 10px', fontSize: '13px' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleTopUp(userItem.id, userItem.username)}
                    disabled={isTopping}
                    style={{ minWidth: 90 }}
                  >
                    {isTopping ? 'Punjem...' : '+ Napuni'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default AdminPanel;
