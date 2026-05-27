import React, { useState, useEffect, useCallback } from 'react';
import { getCart, removeFromCart, checkout } from '../../services/tourService';

function ShoppingCartPanel({ token, onNotice, onError, active, onPurchased }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCart(token);
      setCart(data);
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  }, [token, onError]);

  useEffect(() => {
    if (active) loadCart();
  }, [active, loadCart]);

  const handleRemove = async (tourId, tourName) => {
    setRemovingId(tourId);
    try {
      const updated = await removeFromCart(token, tourId);
      setCart(updated);
      onNotice(`"${tourName}" uklonjena iz korpe`, 'info');
    } catch (err) {
      onError(err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      const result = await checkout(token);
      setCart((prev) => ({ ...prev, items: [], total_price: 0 }));
      onNotice(`Kupovina uspešna! Kupljeno ${result.tokens.length} tura.`, 'success');
      if (onPurchased) onPurchased();
    } catch (err) {
      onError(err);
    } finally {
      setCheckingOut(false);
    }
  };

  const items = cart?.items || [];
  const total = Number(cart?.total_price || 0);

  return (
    <div className="card panel">
      <div className="panel-head">
        <h2 style={{ fontFamily: 'Playfair Display, serif', margin: 0 }}>
          Korpa {items.length > 0 && <span style={{ fontSize: '16px', color: '#66768e' }}>({items.length})</span>}
        </h2>
        <button className="ghost" onClick={loadCart} disabled={loading} style={{ minWidth: 90 }}>
          {loading ? 'Učitavam...' : 'Osveži'}
        </button>
      </div>

      {loading && !cart ? (
        <p className="meta" style={{ textAlign: 'center', padding: '32px 0' }}>Učitavam korpu...</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#66768e' }}>
          <div style={{ fontSize: '48px', marginBottom: 12 }}>🛒</div>
          <p>Korpa je prazna.</p>
          <p className="meta">Dodaj ture iz sekcije "Pretraži ture".</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((item) => (
            <div key={item.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              gap: 12, padding: '12px 14px', border: '1px solid var(--line)',
              borderRadius: 14, background: '#fff',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: 2 }}>{item.tour_name}</div>
                <div style={{ color: '#0d9488', fontWeight: 800, fontSize: '15px' }}>
                  {Number(item.price) === 0 ? 'Besplatno' : `€${Number(item.price).toFixed(2)}`}
                </div>
              </div>
              <button
                className="ghost"
                onClick={() => handleRemove(item.tour_id, item.tour_name)}
                disabled={removingId === item.tour_id}
                style={{ color: '#ef4444', borderColor: '#fecaca', minWidth: 80, flexShrink: 0 }}
              >
                {removingId === item.tour_id ? '...' : 'Ukloni'}
              </button>
            </div>
          ))}

          <div style={{
            borderTop: '2px solid var(--line)', paddingTop: 14, marginTop: 4,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div className="meta">Ukupno</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0d9488' }}>
                {total === 0 ? 'Besplatno' : `€${total.toFixed(2)}`}
              </div>
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              style={{ padding: '12px 28px', fontSize: '15px' }}
            >
              {checkingOut ? 'Obrađujem...' : 'Plati i kupi'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShoppingCartPanel;
