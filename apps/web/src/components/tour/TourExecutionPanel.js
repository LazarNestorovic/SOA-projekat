import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getPurchasedTours,
  getCurrentPosition,
  updateCurrentPosition,
  startTour,
  checkExecutionStatus,
  completeTourExecution,
  abandonTourExecution,
} from '../../services/tourService';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Žuta ikonica — trenutna pozicija turiste
const playerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Crvena — nedosegnuta ključna tačka
const uncompletedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Zelena — dosegnuta ključna tačka
const completedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

/**
 * Position Simulator — klik na mapu teleportuje turista na tu lokaciju.
 * Pozicija se odmah čuva i na back-endu (tourist_current_positions).
 */
function ClickSimulator({ onPositionChange }) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function TourExecutionPanel({ token, user, onNotice, onError }) {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  // Lokalna kopija pozicije (sinhronizovana sa Position Simulatorom)
  const [currentLat, setCurrentLat] = useState(45.25167);
  const [currentLon, setCurrentLon] = useState(19.83694);

  const [completedPoints, setCompletedPoints] = useState([]);
  const [tourKeyPoints, setTourKeyPoints] = useState([]);
  const [routeCoordinates, setRouteCoordinates] = useState([]);

  // ─── Dohvati kupljene ture pri mount-u ───────────────────────────────────
  useEffect(() => {
    fetchTours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchTours = async () => {
    setLoading(true);
    try {
      const purchased = await getPurchasedTours(token);
      // Turista može pokrenuti samo objavljene ili arhivirane ture
      const executable = purchased.filter(
        (t) => t.status === 'published' || t.status === 'archived'
      );
      setTours(executable);
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Position Simulator: klik na mapu ────────────────────────────────────
  // Azurira lokalnu poziciju I šalje je na back-end (tourist_current_positions)
  const handlePositionChange = useCallback(
    async (lat, lon) => {
      setCurrentLat(lat);
      setCurrentLon(lon);
      try {
        await updateCurrentPosition(token, { latitude: lat, longitude: lon });
      } catch (err) {
        console.error('Greška pri azuriranju pozicije:', err);
      }
    },
    [token]
  );

  // ─── Pokretanje ture ─────────────────────────────────────────────────────
  const handleStart = async (tour) => {
    try {
      // 1. Snimi trenutnu poziciju u Position Simulator (back-end)
      await updateCurrentPosition(token, { latitude: currentLat, longitude: currentLon });

      // 2. Kreiraj sesiju
      const session = await startTour(token, tour.id);
      setActiveSession(session);
      setCompletedPoints(session.completed_key_points || []);
      setTourKeyPoints(tour.key_points || []);

      // 3. Odmah pitaj Position Simulator za poziciju, pa proveri ključne tačke
      const pos = await getCurrentPosition(token);
      const lat = pos ? parseFloat(pos.latitude) : currentLat;
      const lon = pos ? parseFloat(pos.longitude) : currentLon;

      setCurrentLat(lat);
      setCurrentLon(lon);

      const res = await checkExecutionStatus(token, session.id, { latitude: lat, longitude: lon });
      if (res.completed_key_points) setCompletedPoints(res.completed_key_points);

      onNotice('Tura je započeta!', 'success');
    } catch (err) {
      onError(err);
    }
  };

  // ─── Napuštanje ture ──────────────────────────────────────────────────────
  const handleAbandon = async () => {
    if (!activeSession) return;
    try {
      await abandonTourExecution(token, activeSession.id);
      setActiveSession(null);
      setCompletedPoints([]);
      setTourKeyPoints([]);
      onNotice('Tura je napuštena.', 'warning');
    } catch (err) {
      onError(err);
    }
  };

  // ─── Interval na 10 sekundi (samo tokom aktivne sesije) ──────────────────
  // Tok: (1) pitaj Position Simulator za poziciju → (2) pošalji na back za proveru tačaka
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active') return;

    const intervalId = setInterval(async () => {
      try {
        // Korak 1 — pitaj Position Simulator (tourist_current_positions)
        const pos = await getCurrentPosition(token);
        if (!pos) return;

        const lat = parseFloat(pos.latitude);
        const lon = parseFloat(pos.longitude);

        // Sinhronizuj lokalnu mapu sa Position Simulatorom
        setCurrentLat(lat);
        setCurrentLon(lon);

        // Korak 2 — pošalji poziciju na back, proveri blizinu ključnih tačaka
        const res = await checkExecutionStatus(token, activeSession.id, {
          latitude: lat,
          longitude: lon,
        });

        if (res.completed_key_points) {
          setCompletedPoints(res.completed_key_points);
        }
        if (res.new_completions) {
          onNotice('Nova ključna tačka je dosegnuta!', 'success');
        }
        if (res.is_finished) {
          onNotice('Tura je uspešno kompletirana! Čestitamo!', 'success');
          clearInterval(intervalId);
          setActiveSession((prev) => ({ ...prev, status: 'completed' }));
        }
      } catch (err) {
        console.error('Greška pri provjeri statusa ture:', err);
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [activeSession, token, onNotice]);

  // ─── Sledeća nedosegnuta ključna tačka (za prikaz putanje) ───────────────
  const nextKeyPoint = useMemo(() => {
    if (!tourKeyPoints.length) return null;
    return tourKeyPoints.find((kp) => !completedPoints.some((c) => c.id === kp.id)) || null;
  }, [tourKeyPoints, completedPoints]);

  // ─── Ruta po putevima do sledeće ključne tačke (OSRM) ────────────────────
  useEffect(() => {
    if (!nextKeyPoint || !activeSession) {
      setRouteCoordinates([]);
      return;
    }

    let cancelled = false;

    const fetchRoute = async () => {
      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${currentLon},${currentLat};${nextKeyPoint.longitude},${nextKeyPoint.latitude}` +
          `?overview=full&geometries=geojson`;

        const response = await fetch(url);
        const data = await response.json();

        if (cancelled) return;

        if (data.routes && data.routes.length > 0) {
          // GeoJSON vraća [lon, lat] — Leaflet očekuje [lat, lon]
          const coords = data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
          setRouteCoordinates(coords);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Greška pri dohvatanju rute (OSRM):', err);
        // Fallback: prava linija ako OSRM nije dostupan
        setRouteCoordinates([
          [currentLat, currentLon],
          [nextKeyPoint.latitude, nextKeyPoint.longitude],
        ]);
      }
    };

    fetchRoute();
    return () => { cancelled = true; };
  }, [currentLat, currentLon, nextKeyPoint, activeSession]);

  // ─── Ekran: tura završena ─────────────────────────────────────────────────
  if (activeSession && activeSession.status === 'completed') {
    return (
      <div className="panel">
        <h2>🎉 Tura je završena! Čestitamo!</h2>
        <p>Uspešno ste kompletirali sve ključne tačke.</p>
        <button
          onClick={() => {
            setActiveSession(null);
            setCompletedPoints([]);
            setTourKeyPoints([]);
            fetchTours();
          }}
        >
          Vrati se na listu tura
        </button>
      </div>
    );
  }

  // ─── Ekran: aktivna tura ─────────────────────────────────────────────────
  if (activeSession) {
    const doneCount = completedPoints.length;
    const totalCount = tourKeyPoints.length;

    return (
      <div className="panel" style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <h2>Aktivna tura</h2>

        <div style={{ marginBottom: '10px' }}>
          <strong>Position simulator:</strong> Kliknite na mapu da se "teleportujete" na tu lokaciju.
          Pozicija se automatski šalje na server svakih 10 sekundi.
          <br />
          <span>
            Napredak: <strong>{doneCount}/{totalCount}</strong> ključnih tačaka dosegnuto.
          </span>
          <br />
          <button
            onClick={handleAbandon}
            style={{
              backgroundColor: '#eb4034',
              color: 'white',
              marginTop: '10px',
              padding: '5px 14px',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            Napusti turu
          </button>
        </div>

        <div style={{ flex: 1, minHeight: '400px', border: '2px solid #ccc' }}>
          <MapContainer
            center={[currentLat, currentLon]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {/* Position Simulator — klik teleportuje turista */}
            <ClickSimulator onPositionChange={handlePositionChange} />

            {/* Trenutna pozicija turiste */}
            <Marker position={[currentLat, currentLon]} icon={playerIcon}>
              <Popup>Vi ste ovde</Popup>
            </Marker>

            {/* Ključne tačke */}
            {tourKeyPoints.map((kp) => {
              const isCompleted = completedPoints.some((c) => c.id === kp.id);
              const reachedAt = completedPoints.find((c) => c.id === kp.id)?.reached_at;
              return (
                <Marker
                  key={kp.id}
                  position={[kp.latitude, kp.longitude]}
                  icon={isCompleted ? completedIcon : uncompletedIcon}
                >
                  <Popup>
                    <strong>{kp.name}</strong>
                    <br />
                    {kp.description}
                    <br />
                    Status: {isCompleted ? `✅ Dosegnuto${reachedAt ? ' u ' + new Date(reachedAt).toLocaleTimeString() : ''}` : '⏳ Na čekanju'}
                  </Popup>
                </Marker>
              );
            })}

            {/* Ruta po putevima do sledeće nedosegnute tačke (OSRM) */}
            {routeCoordinates.length > 1 && (
              <Polyline
                positions={routeCoordinates}
                color="blue"
                dashArray="10, 10"
                weight={3}
              />
            )}
          </MapContainer>
        </div>
      </div>
    );
  }

  // ─── Ekran: lista kupljenih tura ─────────────────────────────────────────
  return (
    <div className="panel">
      <h2>Moje kupljene ture</h2>
      <p style={{ color: '#666', marginBottom: '16px' }}>
        Prikazane su vaše kupljene objavljene i arhivirane ture. Da biste kupili novu turu, idite na <em>Pretraži ture</em>.
      </p>

      {loading && <p>Učitavanje...</p>}

      {!loading && tours.length === 0 && (
        <p style={{ color: '#888' }}>
          Nema kupljenih tura za pokretanje. Idite na <strong>Pretraži ture</strong> i kupite turu putem korpe.
        </p>
      )}

      <div className="list">
        {tours.map((t) => (
          <div
            key={t.id}
            style={{ border: '1px solid #ccc', padding: '12px', margin: '10px 0', borderRadius: '6px' }}
          >
            <h4 style={{ margin: '0 0 6px' }}>
              {t.title}{' '}
              <span style={{ fontWeight: 'normal', color: '#888', fontSize: '13px' }}>
                ({t.status === 'published' ? 'Objavljena' : 'Arhivirana'})
              </span>
            </h4>
            <p style={{ margin: '4px 0' }}>{t.description}</p>
            <p style={{ margin: '4px 0', color: '#555' }}>
              Ključnih tačaka: <strong>{t.key_points ? t.key_points.length : 0}</strong>
              {' · '}
              Težina: <strong>{t.difficulty}</strong>
            </p>
            <button
              onClick={() => handleStart(t)}
              style={{
                marginTop: '8px',
                padding: '6px 16px',
                backgroundColor: '#2e7d32',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ▶ Pokreni turu
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TourExecutionPanel;
