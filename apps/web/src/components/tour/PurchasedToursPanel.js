import React, { useState, useEffect, useCallback } from 'react';
import { getPurchasedTours } from '../../services/tourService';

function KeyPointItem({ kp, index }) {
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '10px 12px',
      border: '1px solid rgba(13,148,136,0.18)', borderRadius: 12,
      background: 'linear-gradient(180deg, #fbffff, #f4fcfb)',
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%', background: '#0d9488',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: '12px', flexShrink: 0,
      }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '14px' }}>{kp.name}</div>
        {kp.description && (
          <div style={{ fontSize: '13px', color: '#415470', marginTop: 2 }}>{kp.description}</div>
        )}
        <div style={{ fontSize: '12px', color: '#66768e', marginTop: 4 }}>
          📍 {Number(kp.latitude).toFixed(5)}, {Number(kp.longitude).toFixed(5)}
        </div>
      </div>
    </div>
  );
}

function PurchasedTourCard({ tour }) {
  const [expanded, setExpanded] = useState(false);
  const keyPoints = tour.key_points || [];

  return (
    <div className="card" style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h3 style={{ marginBottom: 4, fontSize: '16px' }}>{tour.title}</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#0a6f66', background: 'rgba(13,148,136,0.1)',
              borderRadius: 999, padding: '2px 8px',
            }}>
              {tour.difficulty}
            </span>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>✓ Kupljeno</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', color: '#66768e' }}>plaćeno</div>
          <div style={{ fontWeight: 800, color: '#0d9488' }}>
            {Number(tour.price) === 0 ? 'Besplatno' : `€${Number(tour.price).toFixed(2)}`}
          </div>
        </div>
      </div>

      <p style={{ color: '#415470', fontSize: '14px', lineHeight: 1.6 }}>{tour.description}</p>

      <div style={{
        background: 'rgba(13,148,136,0.06)', borderRadius: 10, padding: '8px 12px',
        fontSize: '12px', color: '#0a6f66', fontFamily: 'monospace', wordBreak: 'break-all',
      }}>
        Token: {tour.token}
      </div>

      <div>
        <button
          className="ghost"
          onClick={() => setExpanded((v) => !v)}
          style={{ fontSize: '13px' }}
        >
          {expanded ? 'Sakrij ključne tačke' : `Prikaži sve ključne tačke (${keyPoints.length})`}
        </button>
      </div>

      {expanded && (
        <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#243551', marginBottom: 2 }}>
            Ključne tačke ture
          </div>
          {keyPoints.length === 0 ? (
            <p className="meta">Ova tura nema ključnih tačaka.</p>
          ) : (
            keyPoints.map((kp, i) => <KeyPointItem key={kp.id} kp={kp} index={i} />)
          )}
        </div>
      )}

      <div className="meta">
        Kupljeno: {new Date(tour.purchased_at).toLocaleDateString('sr-RS')}
      </div>
    </div>
  );
}

function PurchasedToursPanel({ token, onError, active }) {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPurchasedTours(token);
      setTours(data);
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  }, [token, onError]);

  useEffect(() => {
    if (active) load();
  }, [active, load]);

  return (
    <div className="card panel">
      <div className="panel-head">
        <h2 style={{ fontFamily: 'Playfair Display, serif', margin: 0 }}>Moje kupljene ture</h2>
        <button className="ghost" onClick={load} disabled={loading} style={{ minWidth: 90 }}>
          {loading ? 'Učitavam...' : 'Osveži'}
        </button>
      </div>

      {loading && tours.length === 0 ? (
        <p className="meta" style={{ textAlign: 'center', padding: '32px 0' }}>Učitavam...</p>
      ) : tours.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#66768e' }}>
          <div style={{ fontSize: '48px', marginBottom: 12 }}>🗺️</div>
          <p>Nisi kupio/la nijednu turu.</p>
          <p className="meta">Pretraži objavljene ture i dodaj ih u korpu.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {tours.map((tour) => (
            <PurchasedTourCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}
    </div>
  );
}

export default PurchasedToursPanel;
