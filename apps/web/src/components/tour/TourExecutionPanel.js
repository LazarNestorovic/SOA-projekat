import React, { useState, useEffect, useMemo } from 'react';
import { 
  getAllTours, 
  purchaseTour, 
  startTour, 
  checkExecutionStatus, 
  completeTourExecution, 
  abandonTourExecution 
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

// Zuta ikonica za trenutnu poziciju igraca
const playerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom ikonica za preostale / zavrsene tacke
const uncompletedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
const completedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

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
  const [activeSession, setActiveSession] = useState(null);
  
  // Pos sim
  const [currentLat, setCurrentLat] = useState(45.25167);
  const [currentLon, setCurrentLon] = useState(19.83694);

  // Mapped data
  const [completedPoints, setCompletedPoints] = useState([]);
  const [tourKeyPoints, setTourKeyPoints] = useState([]);

  useEffect(() => {
    fetchTours();
  }, [token]);

  const fetchTours = async () => {
    try {
      const all = await getAllTours(token);
      // TODO (REVERT LATER): Privremeno omoguceno dohvatanje svih tura
      // const executable = all.filter(t => t.status === 'published' || t.status === 'archived');
      const executable = all;
      setTours(executable);
    } catch (err) {
      onError(err);
    }
  };

  const handlePurchase = async (tourId) => {
    try {
      await purchaseTour(token, tourId);
      onNotice('Tura uspesno kupljena', 'success');
    } catch (err) {
      onError(err);
    }
  };

  const handleStart = async (tour) => {
    try {
      const session = await startTour(token, tour.id);
      setActiveSession(session);
      setCompletedPoints(session.completed_key_points || []);
      setTourKeyPoints(tour.key_points || []);
      onNotice('Tura je zapoceta', 'success');

      // Odmah zabelezi poziciju pri pokretanju
      await checkExecutionStatus(token, session.id, {
         latitude: currentLat,
         longitude: currentLon
      });
    } catch (err) {
      onError(err);
    }
  };

  const handleAbandon = async () => {
    if (!activeSession) return;
    try {
      await abandonTourExecution(token, activeSession.id);
      setActiveSession(null);
      setCompletedPoints([]);
      setTourKeyPoints([]);
      onNotice('Tura je napustena', 'warning');
    } catch (err) {
      onError(err);
    }
  };

  useEffect(() => {
    let intervalId;
    if (activeSession && activeSession.status === 'active') {
      intervalId = setInterval(async () => {
        try {
          const res = await checkExecutionStatus(token, activeSession.id, {
            latitude: currentLat,
            longitude: currentLon
          });
          
          if (res.completed_key_points) {
            setCompletedPoints(res.completed_key_points);
          }
          if (res.new_completions) {
             onNotice('Nova kljucna tacka je ostvarena!', 'success');
          }
          if (res.is_finished) {
             onNotice('Tura je uspesno kompletirana!', 'success');
             clearInterval(intervalId);
             setActiveSession(prev => ({...prev, status: 'completed'}));
          }
        } catch (err) {
          console.error(err);
        }
      }, 10000); // Na 10 sekundi
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeSession, currentLat, currentLon, token, onNotice]);

  // Derived state to find the next key point (first uncompleted)
  const nextKeyPoint = useMemo(() => {
    if (!tourKeyPoints.length) return null;
    return tourKeyPoints.find(kp => 
      !completedPoints.some(c => c.id === kp.id)
    ) || null;
  }, [tourKeyPoints, completedPoints]);

  if (activeSession) {
    if (activeSession.status === 'completed') {
        return (
            <div className="panel">
                <h2>Tura je Završena! Čestitamo!</h2>
                <button onClick={() => {
                    setActiveSession(null);
                    setCompletedPoints([]);
                    setTourKeyPoints([]);
                }}>Vrati se na listu Tura</button>
            </div>
        );
    }

    return (
      <div className="panel" style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <h2>Aktivna Tura</h2>
        
        <div style={{ marginBottom: '10px' }}>
          <strong>Pomoć:</strong> Kliknite bilo gde na mapi kako bi ste se "teleportovali" na tu lokaciju. Prikazuje se put do naredne ključne tačke.
          <br />
          <button onClick={handleAbandon} style={{ backgroundColor: '#eb4034', color: 'white', marginTop: '10px', padding: '5px 10px', border: 'none', cursor: 'pointer' }}>Napusti Turu</button>
        </div>

        <div style={{ flex: 1, minHeight: '400px', border: '2px solid #ccc' }}>
            <MapContainer center={[currentLat, currentLon]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />
                
                {/* Simulator klika */}
                <ClickSimulator onPositionChange={(lat, lon) => {
                    setCurrentLat(lat);
                    setCurrentLon(lon);
                }} />

                {/* Trenutna pozicija turista */}
                <Marker position={[currentLat, currentLon]} icon={playerIcon}>
                    <Popup>Vi ste ovde</Popup>
                </Marker>

                {/* Ključne tačke */}
                {tourKeyPoints.map((kp, idx) => {
                    const isCompleted = completedPoints.some(c => c.id === kp.id);
                    return (
                        <Marker 
                            key={kp.id} 
                            position={[kp.latitude, kp.longitude]}
                            icon={isCompleted ? completedIcon : uncompletedIcon}
                        >
                            <Popup>
                                <strong>{kp.name}</strong><br/>
                                {kp.description}<br/>
                                Status: {isCompleted ? 'Dosegnuto' : 'Na čekanju'}
                            </Popup>
                        </Marker>
                    )
                })}

                {/* Putanja do prve sledeće neostvarene tačke */}
                {nextKeyPoint && (
                    <Polyline 
                        positions={[
                            [currentLat, currentLon],
                            [nextKeyPoint.latitude, nextKeyPoint.longitude]
                        ]} 
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

  return (
    <div className="panel">
      <h2>Ekran za pokretanje Tura</h2>
      <div className="list">
        {tours.map(t => (
          <div key={t.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
            <h4>{t.title} (Status: {t.status})</h4>
            <p>{t.description}</p>
            <p>Br. ključnih tačaka: {t.key_points ? t.key_points.length : 0}</p>
            <div>
               <button onClick={() => handlePurchase(t.id)}>1. Kupi Turu</button>
               <button onClick={() => handleStart(t)} style={{marginLeft: '10px'}}>2. Pokreni Turu</button>
            </div>
          </div>
        ))}
        {tours.length === 0 && <p>Nema dostupnih tura za pokretanje.</p>}
      </div>
    </div>
  );
}

export default TourExecutionPanel;
