import React, { useState, useEffect, useCallback } from 'react';
import { createTour, getMyTours, getAllTours, addKeyPointToTour, createReview, getReviews } from '../../services/tourService';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickMarker({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng) });
  return null;
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <span style={{ display: 'inline-flex', gap: '4px', fontSize: '28px', cursor: 'pointer', lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          style={{ color: s <= (hover || value) ? '#f5a623' : '#ddd', transition: 'color 0.1s' }}
        >★</span>
      ))}
    </span>
  );
}

function StarDisplay({ value }) {
  const rounded = Math.round(value);
  return (
    <span style={{ color: '#f5a623', fontSize: '14px' }}>
      {'★'.repeat(rounded)}{'☆'.repeat(5 - rounded)}
      <span style={{ color: '#666', marginLeft: '4px', fontSize: '13px' }}>({Number(value).toFixed(1)})</span>
    </span>
  );
}

function TourEditorPanel({ token, user, onNotice, onError }) {
  const isAuthor = user?.role === 'author' || user?.role === 'admin';
  // ── create tour state ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [tagsStr, setTagsStr] = useState('');

  const [pendingKPs, setPendingKPs] = useState([]);
  const [pickedPos, setPickedPos] = useState(null);
  const [kpName, setKpName] = useState('');
  const [kpDesc, setKpDesc] = useState('');
  const [kpImage, setKpImage] = useState('');

  const [myTours, setMyTours] = useState([]);
  const [myToursLoading, setMyToursLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedMyMapId, setExpandedMyMapId] = useState(null);

  // ── all tours + reviews state ──
  const [allTours, setAllTours] = useState([]);
  const [allToursLoading, setAllToursLoading] = useState(false);
  const [expandedMapId, setExpandedMapId] = useState(null);
  const [expandedReviewId, setExpandedReviewId] = useState(null);
  const [reviewsCache, setReviewsCache] = useState({});

  // single review form (for the currently expanded tour)
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewVisitDate, setReviewVisitDate] = useState('');
  const [reviewImages, setReviewImages] = useState(['']);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => { fetchMyTours(); fetchAllTours(); }, []); // eslint-disable-line

  const fetchMyTours = async () => {
    try {
      setMyToursLoading(true);
      setMyTours(await getMyTours(token));
    } catch (err) {
      onError(err);
    } finally {
      setMyToursLoading(false);
    }
  };

  const fetchAllTours = async () => {
    try {
      setAllToursLoading(true);
      setAllTours(await getAllTours(token));
    } catch (err) {
      onError(err);
    } finally {
      setAllToursLoading(false);
    }
  };

  const fetchReviews = useCallback(async (tourId) => {
    try {
      const data = await getReviews(token, tourId);
      setReviewsCache((prev) => ({ ...prev, [tourId]: data }));
    } catch (err) {
      onError(err);
    }
  }, [token, onError]);

  const handleAddPendingKP = () => {
    if (!kpName.trim()) { onNotice('Unesi naziv ključne tačke.', 'error'); return; }
    if (!pickedPos) { onNotice('Klikni na mapu da izabereš lokaciju.', 'error'); return; }
    setPendingKPs((prev) => [
      ...prev,
      { id: Date.now(), name: kpName.trim(), description: kpDesc.trim(), imageUrl: kpImage.trim(), lat: pickedPos.lat, lng: pickedPos.lng },
    ]);
    setKpName(''); setKpDesc(''); setKpImage(''); setPickedPos(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !difficulty) {
      onNotice('Naziv, opis i težina su obavezni.', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
      const tour = await createTour(token, { title: title.trim(), description: description.trim(), difficulty, tags });
      for (const kp of pendingKPs) {
        await addKeyPointToTour(token, tour.id, {
          name: kp.name, description: kp.description,
          latitude: kp.lat, longitude: kp.lng, image_url: kp.imageUrl,
        });
      }
      onNotice('Tura uspešno kreirana.', 'success');
      setTitle(''); setDescription(''); setDifficulty(''); setTagsStr('');
      setPendingKPs([]); setPickedPos(null);
      fetchMyTours();
      fetchAllTours();
    } catch (err) {
      onError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleReviews = async (tourId) => {
    if (expandedReviewId === tourId) {
      setExpandedReviewId(null);
      return;
    }
    setExpandedReviewId(tourId);
    setReviewRating(0); setReviewComment(''); setReviewVisitDate(''); setReviewImages(['']);
    if (!reviewsCache[tourId]) {
      await fetchReviews(tourId);
    }
  };

  const handleSubmitReview = async (e, tourId) => {
    e.preventDefault();
    if (!reviewRating) { onNotice('Izaberi ocenu.', 'error'); return; }
    if (!reviewVisitDate) { onNotice('Unesi datum posete.', 'error'); return; }
    try {
      setReviewSubmitting(true);
      const images = reviewImages.map((u) => u.trim()).filter(Boolean);
      await createReview(token, tourId, {
        rating: reviewRating, comment: reviewComment,
        visit_date: reviewVisitDate, images,
      });
      onNotice('Recenzija uspešno dodata.', 'success');
      setReviewRating(0); setReviewComment(''); setReviewVisitDate(''); setReviewImages(['']);
      await fetchReviews(tourId);
      fetchAllTours();
    } catch (err) {
      onError(err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const updateImageUrl = (i, val) => {
    setReviewImages((prev) => { const updated = [...prev]; updated[i] = val; return updated; });
  };

  return (
    <section className="section show">

      {/* ══════════ CREATE TOUR (author only) ══════════ */}
      {isAuthor && <article className="card">
        <h2>Kreiraj turu</h2>
        <form onSubmit={handleCreate}>
          <input placeholder="Naziv ture" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea placeholder="Opis ture" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">-- Izaberi težinu --</option>
            <option value="lako">Lako</option>
            <option value="srednje">Srednje</option>
            <option value="tesko">Teško</option>
          </select>
          <input placeholder="Tagovi (zarezom odvojeni)" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} />

          <div style={{ marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Ključne tačke <span className="meta">(opciono)</span></h3>

            {pendingKPs.length > 0 && (
              <div style={{ marginBottom: '12px', borderRadius: '6px', border: '1px solid #ddd', padding: '8px 12px' }}>
                {pendingKPs.map((kp, i) => (
                  <div key={kp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: i < pendingKPs.length - 1 ? '1px solid #eee' : 'none' }}>
                    <span style={{ flex: 1, fontSize: '0.9rem' }}>
                      <strong>{i + 1}. {kp.name}</strong>
                      {kp.description && <span className="meta"> — {kp.description}</span>}
                      <span className="meta"> ({kp.lat.toFixed(4)}, {kp.lng.toFixed(4)})</span>
                    </span>
                    <button type="button" onClick={() => setPendingKPs((prev) => prev.filter((x) => x.id !== kp.id))}
                      style={{ padding: '2px 8px', background: '#e55', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ height: '280px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd', marginBottom: '10px' }}>
              <MapContainer center={[45.2671, 19.8335]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <ClickMarker onPick={setPickedPos} />
                {pendingKPs.map((kp) => (
                  <Marker key={kp.id} position={[kp.lat, kp.lng]}>
                    <Popup><strong>{kp.name}</strong></Popup>
                  </Marker>
                ))}
                {pickedPos && <Marker position={[pickedPos.lat, pickedPos.lng]} />}
              </MapContainer>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <input placeholder="Naziv tačke *" value={kpName} onChange={(e) => setKpName(e.target.value)} style={{ flex: '1 1 160px' }} />
              <input placeholder="Opis (opciono)" value={kpDesc} onChange={(e) => setKpDesc(e.target.value)} style={{ flex: '2 1 200px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input placeholder="URL slike (opciono)" value={kpImage} onChange={(e) => setKpImage(e.target.value)} style={{ flex: '1 1 200px' }} />
              <span className="meta" style={{ whiteSpace: 'nowrap', color: pickedPos ? 'green' : '#999' }}>
                {pickedPos ? `${pickedPos.lat.toFixed(4)}, ${pickedPos.lng.toFixed(4)}` : 'Klikni na mapu'}
              </span>
              <button type="button" onClick={handleAddPendingKP} style={{ whiteSpace: 'nowrap' }}>+ Dodaj tačku</button>
            </div>
          </div>

          <button type="submit" disabled={submitting} style={{ marginTop: '16px', width: '100%' }}>
            {submitting ? 'Kreiranje...' : `Kreiraj turu${pendingKPs.length > 0 ? ` (${pendingKPs.length} tačk${pendingKPs.length === 1 ? 'a' : 'e'})` : ''}`}
          </button>
        </form>
      </article>}

      {/* ══════════ MY TOURS (author only) ══════════ */}
      {isAuthor && <article className="card">
        <h2>Moje ture</h2>
        {myToursLoading ? (
          <p className="meta">Učitavanje...</p>
        ) : myTours.length === 0 ? (
          <p className="meta">Nemate kreiranih tura.</p>
        ) : (
          myTours.map((tour) => (
            <div key={tour.id} style={{ borderBottom: '1px solid #ddd', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0' }}>{tour.title}</h3>
                  <p className="meta" style={{ margin: '0 0 4px 0' }}>
                    Status: {tour.status} &nbsp;|&nbsp; Cena: {tour.price} RSD &nbsp;|&nbsp; Težina: {tour.difficulty}
                  </p>
                  <p style={{ margin: '0 0 4px 0' }}>{tour.description}</p>
                  {tour.tags?.length > 0 && <p className="meta" style={{ margin: '0 0 4px 0' }}>Tagovi: {tour.tags.join(', ')}</p>}
                  <p className="meta" style={{ margin: 0 }}>Ključne tačke: {tour.key_points?.length || 0}</p>
                </div>
                {tour.key_points?.length > 0 && (
                  <button type="button" onClick={() => setExpandedMyMapId(expandedMyMapId === tour.id ? null : tour.id)} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {expandedMyMapId === tour.id ? 'Zatvori mapu' : 'Prikaži na mapi'}
                  </button>
                )}
              </div>
              {expandedMyMapId === tour.id && (
                <div style={{ height: '280px', marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                  <MapContainer center={[tour.key_points[0].latitude, tour.key_points[0].longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {tour.key_points.map((kp) => (
                      <Marker key={kp.id} position={[kp.latitude, kp.longitude]}>
                        <Popup>
                          <strong>{kp.name}</strong>
                          {kp.description && <><br />{kp.description}</>}
                          {kp.image_url && <><br /><img src={kp.image_url} alt={kp.name} style={{ maxWidth: '120px', marginTop: '4px' }} /></>}
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              )}
            </div>
          ))
        )}
      </article>}

      {/* ══════════ ALL TOURS + REVIEWS ══════════ */}
      <article className="card">
        <h2>Sve ture</h2>
        <p className="meta" style={{ marginTop: 0 }}>Pregledaj sve ture i ostavi recenziju.</p>
        {allToursLoading ? (
          <p className="meta">Učitavanje...</p>
        ) : allTours.length === 0 ? (
          <p className="meta">Nema dostupnih tura.</p>
        ) : (
          allTours.map((tour) => {
            const reviews = reviewsCache[tour.id] || [];
            const isReviewOpen = expandedReviewId === tour.id;
            const isMapOpen = expandedMapId === tour.id;

            return (
              <div key={tour.id} style={{ borderBottom: '1px solid #ddd', paddingBottom: '16px', marginBottom: '16px' }}>
                {/* Tour header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 4px 0' }}>{tour.title}</h3>
                    <p className="meta" style={{ margin: '0 0 4px 0' }}>
                      Težina: {tour.difficulty}
                      {Number(tour.review_count) > 0 && (
                        <> &nbsp;|&nbsp; <StarDisplay value={tour.avg_rating} /> &nbsp;({tour.review_count} recenzij{Number(tour.review_count) === 1 ? 'a' : 'a'})</>
                      )}
                    </p>
                    <p style={{ margin: '0 0 4px 0' }}>{tour.description}</p>
                    {tour.tags?.length > 0 && <p className="meta" style={{ margin: 0 }}>Tagovi: {tour.tags.join(', ')}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                    {tour.key_points?.length > 0 && (
                      <button type="button" onClick={() => setExpandedMapId(isMapOpen ? null : tour.id)} style={{ whiteSpace: 'nowrap' }}>
                        {isMapOpen ? 'Zatvori mapu' : 'Mapa'}
                      </button>
                    )}
                    <button type="button" onClick={() => handleToggleReviews(tour.id)} style={{ whiteSpace: 'nowrap' }}>
                      {isReviewOpen ? 'Zatvori' : `Recenzije${Number(tour.review_count) > 0 ? ` (${tour.review_count})` : ''}`}
                    </button>
                  </div>
                </div>

                {/* Map */}
                {isMapOpen && tour.key_points?.length > 0 && (
                  <div style={{ height: '260px', marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                    <MapContainer center={[tour.key_points[0].latitude, tour.key_points[0].longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {tour.key_points.map((kp) => (
                        <Marker key={kp.id} position={[kp.latitude, kp.longitude]}>
                          <Popup>
                            <strong>{kp.name}</strong>
                            {kp.description && <><br />{kp.description}</>}
                            {kp.image_url && <><br /><img src={kp.image_url} alt={kp.name} style={{ maxWidth: '120px', marginTop: '4px' }} /></>}
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                )}

                {/* Reviews panel */}
                {isReviewOpen && (
                  <div style={{ marginTop: '14px', background: '#f9f9f9', borderRadius: '8px', padding: '14px' }}>

                    {/* Existing reviews */}
                    {reviews.length === 0 ? (
                      <p className="meta" style={{ marginTop: 0 }}>Još nema recenzija. Budi prvi!</p>
                    ) : (
                      <div style={{ marginBottom: '18px' }}>
                        {reviews.map((r) => (
                          <div key={r.id} style={{ borderBottom: '1px solid #e8e8e8', paddingBottom: '12px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                              <strong>{r.tourist_name}</strong>
                              <span style={{ color: '#f5a623', fontSize: '16px' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                            </div>
                            <p className="meta" style={{ margin: '2px 0 6px 0', fontSize: '12px' }}>
                              Poseta: {new Date(r.visit_date).toLocaleDateString('sr-RS')}
                              &nbsp;|&nbsp;
                              Objavljeno: {new Date(r.created_at).toLocaleDateString('sr-RS')}
                            </p>
                            {r.comment && <p style={{ margin: '0 0 6px 0' }}>{r.comment}</p>}
                            {r.images?.length > 0 && (
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {r.images.map((url, i) => (
                                  <img key={i} src={url} alt={`slika-${i + 1}`}
                                    style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Leave a review form */}
                    <form onSubmit={(e) => handleSubmitReview(e, tour.id)}>
                      <h4 style={{ margin: '0 0 10px 0' }}>Ostavi recenziju</h4>

                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Ocena *</label>
                        <StarPicker value={reviewRating} onChange={setReviewRating} />
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Datum posete *</label>
                        <input type="date" value={reviewVisitDate} onChange={(e) => setReviewVisitDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]} style={{ width: '100%' }} />
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Komentar</label>
                        <textarea
                          placeholder="Kako je bilo na turi?"
                          rows={3}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          style={{ width: '100%', resize: 'vertical' }}
                        />
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Slike (URL)</label>
                        {reviewImages.map((url, i) => (
                          <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                            <input
                              placeholder="https://... URL slike"
                              value={url}
                              onChange={(e) => updateImageUrl(i, e.target.value)}
                              style={{ flex: 1 }}
                            />
                            {i > 0 && (
                              <button type="button" onClick={() => setReviewImages((prev) => prev.filter((_, j) => j !== i))}
                                style={{ padding: '0 8px', background: '#e55', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>×</button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => setReviewImages((prev) => [...prev, ''])}
                          style={{ fontSize: '0.85rem', padding: '4px 10px' }}>+ Dodaj sliku</button>
                      </div>

                      <button type="submit" disabled={reviewSubmitting}>
                        {reviewSubmitting ? 'Slanje...' : 'Objavi recenziju'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </article>

    </section>
  );
}

export default TourEditorPanel;
