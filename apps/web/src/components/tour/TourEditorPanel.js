import React, { useState, useEffect, useCallback } from 'react';
import {
	createTour,
	updateTourStatus,
	getMyTours,
	getAllTours,
	addKeyPointToTour,
	updateKeyPoint,
	deleteKeyPoint,
	createReview,
	getReviews,
	getCurrentPosition,
	updateCurrentPosition,
} from '../../services/tourService';
import {
	MapContainer,
	TileLayer,
	Marker,
	Polyline,
	Popup,
	useMapEvents,
} from 'react-leaflet';
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
		<span
			style={{
				display: 'inline-flex',
				gap: '4px',
				fontSize: '28px',
				cursor: 'pointer',
				lineHeight: 1,
			}}>
			{[1, 2, 3, 4, 5].map((s) => (
				<span
					key={s}
					onMouseEnter={() => setHover(s)}
					onMouseLeave={() => setHover(0)}
					onClick={() => onChange(s)}
					style={{
						color: s <= (hover || value) ? '#f5a623' : '#ddd',
						transition: 'color 0.1s',
					}}>
					★
				</span>
			))}
		</span>
	);
}

function StarDisplay({ value }) {
	const rounded = Math.round(value);
	return (
		<span style={{ color: '#f5a623', fontSize: '14px' }}>
			{'★'.repeat(rounded)}
			{'☆'.repeat(5 - rounded)}
			<span style={{ color: '#666', marginLeft: '4px', fontSize: '13px' }}>
				({Number(value).toFixed(1)})
			</span>
		</span>
	);
}

function formatDateTime(value) {
	if (!value) return 'n/a';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'n/a';
	return date.toLocaleString('sr-RS', {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
}

function TourEditorPanel({ token, user, onNotice, onError }) {
	const isAuthor = ['author', 'admin', 'guide'].includes(user?.role);
	const isTourist = user?.role === 'tourist';
	// ── create tour state ──
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [difficulty, setDifficulty] = useState('');
	const [tagsStr, setTagsStr] = useState('');
	const [price, setPrice] = useState('');
	const [walkMinutes, setWalkMinutes] = useState('');
	const [bikeMinutes, setBikeMinutes] = useState('');
	const [carMinutes, setCarMinutes] = useState('');
	const [statusChanging, setStatusChanging] = useState(null);

	const [pendingKPs, setPendingKPs] = useState([]);
	const [pendingRoutePositions, setPendingRoutePositions] = useState(null);
	const [pickedPos, setPickedPos] = useState(null);
	const [kpName, setKpName] = useState('');
	const [kpDesc, setKpDesc] = useState('');
	const [kpImage, setKpImage] = useState('');

	const [myTours, setMyTours] = useState([]);
	const [myToursLoading, setMyToursLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [expandedMyMapId, setExpandedMyMapId] = useState(null);
	const [editingKeyPointId, setEditingKeyPointId] = useState(null);
	const [kpSaving, setKpSaving] = useState(false);
	const [editKpName, setEditKpName] = useState('');
	const [editKpDesc, setEditKpDesc] = useState('');
	const [editKpImage, setEditKpImage] = useState('');
	const [editKpPos, setEditKpPos] = useState(null);
	const [addTargetTourId, setAddTargetTourId] = useState(null);
	const [addKpName, setAddKpName] = useState('');
	const [addKpDesc, setAddKpDesc] = useState('');
	const [addKpImage, setAddKpImage] = useState('');
	const [addKpPos, setAddKpPos] = useState(null);

	// ── all tours + reviews state ──
	const [allTours, setAllTours] = useState([]);
	const [allToursLoading, setAllToursLoading] = useState(false);
	const [expandedMapId, setExpandedMapId] = useState(null);
	const [expandedMapRoutes, setExpandedMapRoutes] = useState({});
	const [expandedReviewId, setExpandedReviewId] = useState(null);
	const [reviewsCache, setReviewsCache] = useState({});

	// single review form (for the currently expanded tour)
	const [reviewRating, setReviewRating] = useState(0);
	const [reviewComment, setReviewComment] = useState('');
	const [reviewVisitDate, setReviewVisitDate] = useState('');
	const [reviewImages, setReviewImages] = useState(['']);
	const [reviewSubmitting, setReviewSubmitting] = useState(false);

	// ── tourist position simulator ──
	const [currentPosition, setCurrentPosition] = useState(null);
	const [positionLoading, setPositionLoading] = useState(false);
	const [positionSaving, setPositionSaving] = useState(false);
	const [selectedPosition, setSelectedPosition] = useState(null);

	useEffect(() => {
		fetchMyTours();
		fetchAllTours();
		if (isTourist) {
			fetchCurrentPosition();
		}
	}, []); // eslint-disable-line

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

	const fetchCurrentPosition = async () => {
		try {
			setPositionLoading(true);
			const data = await getCurrentPosition(token);
			if (data) {
				const loadedPosition = {
					lat: Number(data.latitude),
					lng: Number(data.longitude),
					updatedAt: data.updated_at,
				};
				setCurrentPosition(loadedPosition);
				setSelectedPosition({
					lat: loadedPosition.lat,
					lng: loadedPosition.lng,
				});
			} else {
				setCurrentPosition(null);
				setSelectedPosition(null);
			}
		} catch (err) {
			onError(err);
		} finally {
			setPositionLoading(false);
		}
	};

	const fetchReviews = useCallback(
		async (tourId) => {
			try {
				const data = await getReviews(token, tourId);
				setReviewsCache((prev) => ({ ...prev, [tourId]: data }));
			} catch (err) {
				onError(err);
			}
		},
		[token, onError],
	);

	// Helper: request a routed polyline from OSRM (returns array of [lat,lng])
	const getRouteFromOsrm = async (points) => {
		if (!points || points.length < 2) return null;
		const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
		// First try Map Matching to snap points to roads
		try {
			const matchUrl = `https://router.project-osrm.org/match/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
			const mresp = await fetch(matchUrl);
			if (mresp.ok) {
				const mjs = await mresp.json();
				if (
					mjs.matchings &&
					mjs.matchings[0] &&
					mjs.matchings[0].geometry &&
					mjs.matchings[0].geometry.coordinates
				) {
					return mjs.matchings[0].geometry.coordinates.map((c) => [c[1], c[0]]);
				}
			}
		} catch (e) {
			console.warn('OSRM match error', e);
		}
		// Fallback to route endpoint
		try {
			const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
			const resp = await fetch(url);
			if (!resp.ok) return null;
			const js = await resp.json();
			if (
				js.routes &&
				js.routes[0] &&
				js.routes[0].geometry &&
				js.routes[0].geometry.coordinates
			) {
				return js.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
			}
			return null;
		} catch (e) {
			console.warn('OSRM route error', e);
			return null;
		}
	};

	// Compute route for pendingKPs (create preview)
	useEffect(() => {
		let mounted = true;
		(async () => {
			if (pendingKPs.length < 2) {
				if (mounted) setPendingRoutePositions(null);
				return;
			}
			const pts = pendingKPs.map((kp) => ({ lat: kp.lat, lng: kp.lng }));
			const route = await getRouteFromOsrm(pts);
			if (mounted) setPendingRoutePositions(route);
		})();
		return () => {
			mounted = false;
		};
	}, [pendingKPs]);

	// Compute routes for expanded maps (myTours/allTours) when expanded
	useEffect(() => {
		let mounted = true;
		(async () => {
			const tourId = expandedMyMapId || expandedMapId;
			if (!tourId) return;
			// find tour in myTours or allTours
			const tour =
				myTours.find((t) => t.id === tourId) ||
				allTours.find((t) => t.id === tourId);
			if (!tour || !tour.key_points || tour.key_points.length < 2) return;
			const pts = tour.key_points.map((kp) => ({
				lat: Number(kp.latitude),
				lng: Number(kp.longitude),
			}));
			const route = await getRouteFromOsrm(pts);
			if (mounted && route) {
				setExpandedMapRoutes((prev) => ({ ...prev, [tourId]: route }));
			}
		})();
		return () => {
			mounted = false;
		};
	}, [expandedMyMapId, expandedMapId, myTours, allTours]);

	const handleAddPendingKP = () => {
		if (!kpName.trim()) {
			onNotice('Unesi naziv ključne tačke.', 'error');
			return;
		}
		if (!pickedPos) {
			onNotice('Klikni na mapu da izabereš lokaciju.', 'error');
			return;
		}
		setPendingKPs((prev) => [
			...prev,
			{
				id: Date.now(),
				name: kpName.trim(),
				description: kpDesc.trim(),
				imageUrl: kpImage.trim(),
				lat: pickedPos.lat,
				lng: pickedPos.lng,
			},
		]);
		setKpName('');
		setKpDesc('');
		setKpImage('');
		setPickedPos(null);
	};

	const startEditingKeyPoint = (tourId, keyPoint) => {
		setExpandedMyMapId(tourId);
		setAddTargetTourId(null);
		setAddKpName('');
		setAddKpDesc('');
		setAddKpImage('');
		setAddKpPos(null);
		setEditingKeyPointId(keyPoint.id);
		setEditKpName(keyPoint.name || '');
		setEditKpDesc(keyPoint.description || '');
		setEditKpImage(keyPoint.image_url || '');
		setEditKpPos({
			lat: Number(keyPoint.latitude),
			lng: Number(keyPoint.longitude),
		});
	};

	const cancelEditingKeyPoint = () => {
		setEditingKeyPointId(null);
		setEditKpName('');
		setEditKpDesc('');
		setEditKpImage('');
		setEditKpPos(null);
	};

	const handleUpdateKeyPoint = async (tourId, keyPointId) => {
		if (!editKpName.trim()) {
			onNotice('Naziv ključne tačke je obavezan.', 'error');
			return;
		}
		if (!editKpPos) {
			onNotice('Klikni na mapu da izabereš novu lokaciju.', 'error');
			return;
		}

		try {
			setKpSaving(true);
			await updateKeyPoint(token, keyPointId, {
				name: editKpName.trim(),
				description: editKpDesc.trim(),
				latitude: editKpPos.lat,
				longitude: editKpPos.lng,
				image_url: editKpImage.trim(),
			});
			onNotice('Ključna tačka je uspešno izmenjena.', 'success');
			cancelEditingKeyPoint();
			setExpandedMyMapId(tourId);
			await fetchMyTours();
			await fetchAllTours();
		} catch (err) {
			onError(err);
		} finally {
			setKpSaving(false);
		}
	};

	const handleDeleteKeyPoint = async (tourId, keyPointId) => {
		const confirmed = window.confirm(
			'Da li sigurno želiš da obrišeš ovu ključnu tačku?',
		);
		if (!confirmed) return;

		try {
			setKpSaving(true);
			await deleteKeyPoint(token, keyPointId);
			onNotice('Ključna tačka je obrisana.', 'success');
			if (editingKeyPointId === keyPointId) {
				cancelEditingKeyPoint();
			}
			setExpandedMyMapId(tourId);
			await fetchMyTours();
			await fetchAllTours();
		} catch (err) {
			onError(err);
		} finally {
			setKpSaving(false);
		}
	};

	const handleAddKeyPointToExistingTour = async (tourId) => {
		if (!addKpName.trim()) {
			onNotice('Unesi naziv ključne tačke.', 'error');
			return;
		}
		if (!addKpPos) {
			onNotice('Klikni na mapu da izabereš lokaciju.', 'error');
			return;
		}

		try {
			setKpSaving(true);
			await addKeyPointToTour(token, tourId, {
				name: addKpName.trim(),
				description: addKpDesc.trim(),
				latitude: addKpPos.lat,
				longitude: addKpPos.lng,
				image_url: addKpImage.trim(),
			});
			onNotice('Nova ključna tačka je dodata.', 'success');
			setAddKpName('');
			setAddKpDesc('');
			setAddKpImage('');
			setAddKpPos(null);
			setAddTargetTourId(null);
			setExpandedMyMapId(tourId);
			await fetchMyTours();
			await fetchAllTours();
		} catch (err) {
			onError(err);
		} finally {
			setKpSaving(false);
		}
	};

	const handleCreate = async (e) => {
		e.preventDefault();
		if (!title.trim() || !description.trim() || !difficulty) {
			onNotice('Naziv, opis i težina su obavezni.', 'error');
			return;
		}
		const transportTimes = {
			peske: Number(walkMinutes),
			bicikl: Number(bikeMinutes),
			automobil: Number(carMinutes),
		};
		const hasTransportTime = Object.values(transportTimes).some(
			(value) => Number.isFinite(value) && value > 0,
		);
		if (!hasTransportTime) {
			onNotice(
				'Unesi bar jedno vreme obilaska za prevoz: peške, bicikl ili automobil.',
				'error',
			);
			return;
		}
		try {
			setSubmitting(true);
			const tags = tagsStr
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean);
			const tour = await createTour(token, {
				title: title.trim(),
				description: description.trim(),
				difficulty,
				tags,
				price: parseFloat(price) || 0,
				transport_times: transportTimes,
			});
			for (const kp of pendingKPs) {
				await addKeyPointToTour(token, tour.id, {
					name: kp.name,
					description: kp.description,
					latitude: kp.lat,
					longitude: kp.lng,
					image_url: kp.imageUrl,
				});
			}
			onNotice('Tura uspešno kreirana.', 'success');
			setTitle('');
			setDescription('');
			setDifficulty('');
			setTagsStr('');
			setPrice('');
			setWalkMinutes('');
			setBikeMinutes('');
			setCarMinutes('');
			setPendingKPs([]);
			setPickedPos(null);
			fetchMyTours();
			fetchAllTours();
		} catch (err) {
			onError(err);
		} finally {
			setSubmitting(false);
		}
	};

	const handleChangeStatus = async (tourId, newStatus) => {
		setStatusChanging(tourId);
		try {
			await updateTourStatus(token, tourId, newStatus);
			const label =
				newStatus === 'published'
					? 'objavljena'
					: newStatus === 'archived'
						? 'arhivirana'
						: 'vraćena na draft';
			if (newStatus === 'published') {
				onNotice(
					'Tura je uspešno objavljena ili ponovo aktivirana.',
					'success',
				);
				fetchMyTours();
				fetchAllTours();
				return;
			}
			onNotice(`Tura je uspešno ${label}.`, 'success');
			fetchMyTours();
			fetchAllTours();
		} catch (err) {
			onError(err);
		} finally {
			setStatusChanging(null);
		}
	};

	const handleToggleReviews = async (tourId) => {
		if (expandedReviewId === tourId) {
			setExpandedReviewId(null);
			return;
		}
		setExpandedReviewId(tourId);
		setReviewRating(0);
		setReviewComment('');
		setReviewVisitDate('');
		setReviewImages(['']);
		if (!reviewsCache[tourId]) {
			await fetchReviews(tourId);
		}
	};

	const handleSubmitReview = async (e, tourId) => {
		e.preventDefault();
		if (!reviewRating) {
			onNotice('Izaberi ocenu.', 'error');
			return;
		}
		if (!reviewVisitDate) {
			onNotice('Unesi datum posete.', 'error');
			return;
		}
		try {
			setReviewSubmitting(true);
			const images = reviewImages.map((u) => u.trim()).filter(Boolean);
			await createReview(token, tourId, {
				rating: reviewRating,
				comment: reviewComment,
				visit_date: reviewVisitDate,
				images,
			});
			onNotice('Recenzija uspešno dodata.', 'success');
			setReviewRating(0);
			setReviewComment('');
			setReviewVisitDate('');
			setReviewImages(['']);
			await fetchReviews(tourId);
			fetchAllTours();
		} catch (err) {
			onError(err);
		} finally {
			setReviewSubmitting(false);
		}
	};

	const updateImageUrl = (i, val) => {
		setReviewImages((prev) => {
			const updated = [...prev];
			updated[i] = val;
			return updated;
		});
	};

	const handleSaveCurrentPosition = async () => {
		if (!selectedPosition) {
			onNotice('Klikni na mapu da izabereš trenutnu lokaciju.', 'error');
			return;
		}

		try {
			setPositionSaving(true);
			const saved = await updateCurrentPosition(token, {
				latitude: selectedPosition.lat,
				longitude: selectedPosition.lng,
			});

			setCurrentPosition({
				lat: Number(saved.latitude),
				lng: Number(saved.longitude),
				updatedAt: saved.updated_at,
			});
			onNotice('Trenutna lokacija je sačuvana.', 'success');
		} catch (err) {
			onError(err);
		} finally {
			setPositionSaving(false);
		}
	};

	return (
		<section className="section show">
			{/* ══════════ CREATE TOUR (author only) ══════════ */}
			{isAuthor && (
				<article className="card">
					<h2>Kreiraj turu</h2>
					<form onSubmit={handleCreate}>
						<input
							placeholder="Naziv ture"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
						<textarea
							placeholder="Opis ture"
							rows={3}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
						<select
							value={difficulty}
							onChange={(e) => setDifficulty(e.target.value)}>
							<option value="">-- Izaberi težinu --</option>
							<option value="lako">Lako</option>
							<option value="srednje">Srednje</option>
							<option value="tesko">Teško</option>
						</select>
						<input
							placeholder="Tagovi (zarezom odvojeni)"
							value={tagsStr}
							onChange={(e) => setTagsStr(e.target.value)}
						/>
						<input
							type="number"
							placeholder="Cena (€) — ostavi 0 za besplatno"
							value={price}
							min="0"
							step="0.01"
							onChange={(e) => setPrice(e.target.value)}
						/>

						<div
							style={{
								marginTop: '16px',
								padding: '12px',
								border: '1px solid #ddd',
								borderRadius: '8px',
								background: '#fafafa',
							}}>
							<h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>
								Vreme obilaska po prevozu{' '}
								<span className="meta">(obavezno bar jedno)</span>
							</h3>
							<div style={{ display: 'grid', gap: '8px' }}>
								<input
									type="number"
									min="0"
									step="1"
									placeholder="Peške - minuti npr. 120"
									value={walkMinutes}
									onChange={(e) => setWalkMinutes(e.target.value)}
								/>
								<input
									type="number"
									min="0"
									step="1"
									placeholder="Bicikl - minuti npr. 45"
									value={bikeMinutes}
									onChange={(e) => setBikeMinutes(e.target.value)}
								/>
								<input
									type="number"
									min="0"
									step="1"
									placeholder="Automobil - minuti"
									value={carMinutes}
									onChange={(e) => setCarMinutes(e.target.value)}
								/>
							</div>
						</div>

						<div style={{ marginTop: '20px' }}>
							<h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>
								Ključne tačke <span className="meta">(opciono)</span>
							</h3>

							{pendingKPs.length > 0 && (
								<div
									style={{
										marginBottom: '12px',
										borderRadius: '6px',
										border: '1px solid #ddd',
										padding: '8px 12px',
									}}>
									{pendingKPs.map((kp, i) => (
										<div
											key={kp.id}
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '8px',
												padding: '4px 0',
												borderBottom:
													i < pendingKPs.length - 1 ? '1px solid #eee' : 'none',
											}}>
											<span style={{ flex: 1, fontSize: '0.9rem' }}>
												<strong>
													{i + 1}. {kp.name}
												</strong>
												{kp.description && (
													<span className="meta"> — {kp.description}</span>
												)}
												<span className="meta">
													{' '}
													({kp.lat.toFixed(4)}, {kp.lng.toFixed(4)})
												</span>
											</span>
											<button
												type="button"
												onClick={() =>
													setPendingKPs((prev) =>
														prev.filter((x) => x.id !== kp.id),
													)
												}
												style={{
													padding: '2px 8px',
													background: '#e55',
													color: '#fff',
													border: 'none',
													borderRadius: '4px',
													cursor: 'pointer',
												}}>
												×
											</button>
										</div>
									))}
								</div>
							)}

							<div
								style={{
									height: '280px',
									borderRadius: '8px',
									overflow: 'hidden',
									border: '1px solid #ddd',
									marginBottom: '10px',
								}}>
								<MapContainer
									center={[45.2671, 19.8335]}
									zoom={12}
									style={{ height: '100%', width: '100%' }}>
									<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
									<ClickMarker onPick={setPickedPos} />
									{pendingKPs.length > 1 && (
										<Polyline
											positions={
												pendingRoutePositions ||
												pendingKPs.map((kp) => [kp.lat, kp.lng])
											}
											pathOptions={{ color: '#1f7a8c', weight: 4 }}
										/>
									)}
									{pendingKPs.map((kp) => (
										<Marker key={kp.id} position={[kp.lat, kp.lng]}>
											<Popup>
												<strong>{kp.name}</strong>
											</Popup>
										</Marker>
									))}
									{pickedPos && (
										<Marker position={[pickedPos.lat, pickedPos.lng]} />
									)}
								</MapContainer>
							</div>

							<div
								style={{
									display: 'flex',
									gap: '8px',
									flexWrap: 'wrap',
									marginBottom: '8px',
								}}>
								<input
									placeholder="Naziv tačke *"
									value={kpName}
									onChange={(e) => setKpName(e.target.value)}
									style={{ flex: '1 1 160px' }}
								/>
								<input
									placeholder="Opis (opciono)"
									value={kpDesc}
									onChange={(e) => setKpDesc(e.target.value)}
									style={{ flex: '2 1 200px' }}
								/>
							</div>
							<div
								style={{
									display: 'flex',
									gap: '8px',
									alignItems: 'center',
									flexWrap: 'wrap',
								}}>
								<input
									placeholder="URL slike (opciono)"
									value={kpImage}
									onChange={(e) => setKpImage(e.target.value)}
									style={{ flex: '1 1 200px' }}
								/>
								<span
									className="meta"
									style={{
										whiteSpace: 'nowrap',
										color: pickedPos ? 'green' : '#999',
									}}>
									{pickedPos
										? `${pickedPos.lat.toFixed(4)}, ${pickedPos.lng.toFixed(4)}`
										: 'Klikni na mapu'}
								</span>
								<button
									type="button"
									onClick={handleAddPendingKP}
									style={{ whiteSpace: 'nowrap' }}>
									+ Dodaj tačku
								</button>
							</div>
						</div>

						<button
							type="submit"
							disabled={submitting}
							style={{ marginTop: '16px', width: '100%' }}>
							{submitting
								? 'Kreiranje...'
								: `Kreiraj turu${pendingKPs.length > 0 ? ` (${pendingKPs.length} tačk${pendingKPs.length === 1 ? 'a' : 'e'})` : ''}`}
						</button>
					</form>
				</article>
			)}

			{/* ══════════ POSITION SIMULATOR (tourist only) ══════════ */}
			{isTourist && (
				<article className="card">
					<h2>Simulator pozicije</h2>
					<p className="meta" style={{ marginTop: 0 }}>
						Klikom na mapu postavljaš svoju trenutnu lokaciju (lat/long) za
						TourExecution.
					</p>

					{positionLoading ? (
						<p className="meta">Učitavanje trenutne lokacije...</p>
					) : (
						<>
							<div
								style={{
									height: '300px',
									borderRadius: '8px',
									overflow: 'hidden',
									border: '1px solid #ddd',
									marginBottom: '12px',
								}}>
								<MapContainer
									center={
										selectedPosition
											? [selectedPosition.lat, selectedPosition.lng]
											: [45.2671, 19.8335]
									}
									zoom={12}
									style={{ height: '100%', width: '100%' }}>
									<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
									<ClickMarker onPick={setSelectedPosition} />
									{currentPosition && (
										<Marker
											position={[currentPosition.lat, currentPosition.lng]}>
											<Popup>Sačuvana trenutna lokacija</Popup>
										</Marker>
									)}
									{selectedPosition && (
										<Marker
											position={[selectedPosition.lat, selectedPosition.lng]}>
											<Popup>Izabrana lokacija</Popup>
										</Marker>
									)}
								</MapContainer>
							</div>

							<p className="meta" style={{ margin: '0 0 8px 0' }}>
								Izabrano:{' '}
								{selectedPosition
									? `${selectedPosition.lat.toFixed(5)}, ${selectedPosition.lng.toFixed(5)}`
									: 'nije izabrano'}
							</p>
							<p className="meta" style={{ margin: '0 0 12px 0' }}>
								Sačuvano:{' '}
								{currentPosition
									? `${currentPosition.lat.toFixed(5)}, ${currentPosition.lng.toFixed(5)}${currentPosition.updatedAt ? ` (ažurirano ${new Date(currentPosition.updatedAt).toLocaleString('sr-RS')})` : ''}`
									: 'nema prethodno sačuvane lokacije'}
							</p>

							<button
								type="button"
								onClick={handleSaveCurrentPosition}
								disabled={positionSaving}>
								{positionSaving ? 'Čuvanje...' : 'Sačuvaj trenutnu lokaciju'}
							</button>
						</>
					)}
				</article>
			)}

			{/* ══════════ MY TOURS (author only) ══════════ */}
			{isAuthor && (
				<article className="card">
					<h2>Moje ture</h2>
					{myToursLoading ? (
						<p className="meta">Učitavanje...</p>
					) : myTours.length === 0 ? (
						<p className="meta">Nemate kreiranih tura.</p>
					) : (
						myTours.map((tour) => (
							<div
								key={tour.id}
								style={{
									borderBottom: '1px solid #ddd',
									paddingBottom: '16px',
									marginBottom: '16px',
								}}>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'flex-start',
										gap: '12px',
									}}>
									<div style={{ flex: 1 }}>
										<h3 style={{ margin: '0 0 4px 0' }}>{tour.title}</h3>
										<p className="meta" style={{ margin: '0 0 4px 0' }}>
											Status: {tour.status} &nbsp;|&nbsp; Cena: {tour.price} RSD
											&nbsp;|&nbsp; Težina: {tour.difficulty}
										</p>
										<p className="meta" style={{ margin: '0 0 4px 0' }}>
											Objavljena: {formatDateTime(tour.published_at)}{' '}
											&nbsp;|&nbsp; Arhivirana:{' '}
											{formatDateTime(tour.archived_at)}
										</p>
										<p style={{ margin: '0 0 4px 0' }}>{tour.description}</p>
										{tour.tags?.length > 0 && (
											<p className="meta" style={{ margin: '0 0 4px 0' }}>
												Tagovi: {tour.tags.join(', ')}
											</p>
										)}
										<p className="meta" style={{ margin: 0 }}>
											Ključne tačke: {tour.key_points?.length || 0}
										</p>
										<div
											style={{
												marginTop: '8px',
												display: 'flex',
												gap: '8px',
												flexWrap: 'wrap',
												alignItems: 'center',
											}}>
											<button
												type="button"
												onClick={() => {
													cancelEditingKeyPoint();
													setAddTargetTourId(tour.id);
													setExpandedMyMapId(tour.id);
													setAddKpPos(null);
													setAddKpName('');
													setAddKpDesc('');
													setAddKpImage('');
												}}
												style={{ whiteSpace: 'nowrap' }}>
												+ Dodaj tačku na turu
											</button>
											{tour.status !== 'published' &&
												tour.status !== 'archived' && (
													<button
														type="button"
														disabled={statusChanging === tour.id}
														onClick={() =>
															handleChangeStatus(tour.id, 'published')
														}
														style={{
															whiteSpace: 'nowrap',
															background:
																'linear-gradient(120deg,#10b981,#059669)',
														}}>
														{statusChanging === tour.id ? '...' : 'Objavi turu'}
													</button>
												)}
											{tour.status === 'published' && (
												<>
													<span
														style={{
															fontSize: '12px',
															color: '#10b981',
															fontWeight: 700,
														}}>
														✓ Objavljena
													</span>
													<button
														type="button"
														disabled={statusChanging === tour.id}
														onClick={() =>
															handleChangeStatus(tour.id, 'archived')
														}
														style={{
															whiteSpace: 'nowrap',
															background:
																'linear-gradient(120deg,#6b7280,#4b5563)',
														}}>
														{statusChanging === tour.id ? '...' : 'Arhiviraj'}
													</button>
												</>
											)}
											{tour.status === 'archived' && (
												<>
													<span
														style={{
															fontSize: '12px',
															color: '#6b7280',
															fontWeight: 700,
														}}>
														Arhivirana
													</span>
													<button
														type="button"
														disabled={statusChanging === tour.id}
														onClick={() =>
															handleChangeStatus(tour.id, 'published')
														}
														style={{
															whiteSpace: 'nowrap',
															background:
																'linear-gradient(120deg,#f59e0b,#d97706)',
														}}>
														{statusChanging === tour.id
															? '...'
															: 'Ponovo objavi'}
													</button>
													<span style={{ fontSize: '12px', color: '#6b7280' }}>
														Arhivirana: {formatDateTime(tour.archived_at)}
													</span>
												</>
											)}
										</div>

										{tour.key_points?.length > 0 && (
											<div
												style={{
													marginTop: '10px',
													borderTop: '1px dashed #ddd',
													paddingTop: '8px',
												}}>
												{tour.key_points.map((kp, kpIdx) => (
													<div
														key={kp.id}
														style={{
															display: 'flex',
															justifyContent: 'space-between',
															gap: '8px',
															marginBottom: '6px',
															alignItems: 'center',
														}}>
														<span className="meta" style={{ flex: 1 }}>
															{kpIdx + 1}. {kp.name} (
															{Number(kp.latitude).toFixed(4)},{' '}
															{Number(kp.longitude).toFixed(4)})
														</span>
														<div style={{ display: 'flex', gap: '6px' }}>
															<button
																type="button"
																onClick={() =>
																	startEditingKeyPoint(tour.id, kp)
																}
																disabled={kpSaving}>
																Izmeni
															</button>
															<button
																type="button"
																onClick={() =>
																	handleDeleteKeyPoint(tour.id, kp.id)
																}
																disabled={kpSaving}
																style={{ background: '#e55' }}>
																Obriši
															</button>
														</div>
													</div>
												))}
											</div>
										)}
									</div>
									<button
										type="button"
										onClick={() =>
											setExpandedMyMapId(
												expandedMyMapId === tour.id ? null : tour.id,
											)
										}
										style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
										{expandedMyMapId === tour.id
											? 'Zatvori mapu'
											: 'Prikaži na mapi'}
									</button>
								</div>
								{expandedMyMapId === tour.id && (
									<div
										style={{
											height: '280px',
											marginTop: '12px',
											borderRadius: '8px',
											overflow: 'hidden',
											border: '1px solid #ddd',
										}}>
										<MapContainer
											center={
												editingKeyPointId &&
												editKpPos &&
												expandedMyMapId === tour.id
													? [editKpPos.lat, editKpPos.lng]
													: tour.key_points?.length > 0
														? [
																tour.key_points[0].latitude,
																tour.key_points[0].longitude,
															]
														: [45.2671, 19.8335]
											}
											zoom={13}
											style={{ height: '100%', width: '100%' }}>
											<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
											{tour.key_points?.length > 1 && (
												<Polyline
													positions={
														expandedMapRoutes[tour.id] ||
														tour.key_points.map((kp) => [
															kp.latitude,
															kp.longitude,
														])
													}
													pathOptions={{ color: '#1f7a8c', weight: 4 }}
												/>
											)}
											{editingKeyPointId && expandedMyMapId === tour.id && (
												<ClickMarker onPick={setEditKpPos} />
											)}
											{addTargetTourId === tour.id && (
												<ClickMarker onPick={setAddKpPos} />
											)}
											{tour.key_points.map((kp) => (
												<Marker
													key={kp.id}
													position={[kp.latitude, kp.longitude]}>
													<Popup>
														<strong>{kp.name}</strong>
														{kp.description && (
															<>
																<br />
																{kp.description}
															</>
														)}
														{kp.image_url && (
															<>
																<br />
																<img
																	src={kp.image_url}
																	alt={kp.name}
																	style={{
																		maxWidth: '120px',
																		marginTop: '4px',
																	}}
																/>
															</>
														)}
													</Popup>
												</Marker>
											))}
											{editingKeyPointId &&
												editKpPos &&
												expandedMyMapId === tour.id && (
													<Marker position={[editKpPos.lat, editKpPos.lng]}>
														<Popup>Nova pozicija za izmenu</Popup>
													</Marker>
												)}
											{addTargetTourId === tour.id && addKpPos && (
												<Marker position={[addKpPos.lat, addKpPos.lng]}>
													<Popup>Nova tačka</Popup>
												</Marker>
											)}
										</MapContainer>
									</div>
								)}

								{editingKeyPointId && expandedMyMapId === tour.id && (
									<div
										style={{
											marginTop: '12px',
											border: '1px solid #ddd',
											borderRadius: '8px',
											padding: '10px',
										}}>
										<h4 style={{ margin: '0 0 8px 0' }}>
											Izmena ključne tačke
										</h4>
										<input
											placeholder="Naziv tačke *"
											value={editKpName}
											onChange={(e) => setEditKpName(e.target.value)}
										/>
										<input
											placeholder="Opis"
											value={editKpDesc}
											onChange={(e) => setEditKpDesc(e.target.value)}
											style={{ marginTop: '8px' }}
										/>
										<input
											placeholder="URL slike"
											value={editKpImage}
											onChange={(e) => setEditKpImage(e.target.value)}
											style={{ marginTop: '8px' }}
										/>
										<p className="meta" style={{ margin: '8px 0 10px 0' }}>
											Koordinate:{' '}
											{editKpPos
												? `${editKpPos.lat.toFixed(5)}, ${editKpPos.lng.toFixed(5)}`
												: 'Klikni na mapu'}
										</p>
										<div style={{ display: 'flex', gap: '8px' }}>
											<button
												type="button"
												onClick={() =>
													handleUpdateKeyPoint(tour.id, editingKeyPointId)
												}
												disabled={kpSaving}>
												{kpSaving ? 'Čuvanje...' : 'Sačuvaj izmenu'}
											</button>
											<button
												type="button"
												onClick={cancelEditingKeyPoint}
												disabled={kpSaving}>
												Otkaži
											</button>
										</div>
									</div>
								)}

								{addTargetTourId === tour.id && (
									<div
										style={{
											marginTop: '12px',
											border: '1px solid #ddd',
											borderRadius: '8px',
											padding: '10px',
										}}>
										<h4 style={{ margin: '0 0 8px 0' }}>Nova ključna tačka</h4>
										<input
											placeholder="Naziv tačke *"
											value={addKpName}
											onChange={(e) => setAddKpName(e.target.value)}
										/>
										<input
											placeholder="Opis"
											value={addKpDesc}
											onChange={(e) => setAddKpDesc(e.target.value)}
											style={{ marginTop: '8px' }}
										/>
										<input
											placeholder="URL slike"
											value={addKpImage}
											onChange={(e) => setAddKpImage(e.target.value)}
											style={{ marginTop: '8px' }}
										/>
										<p className="meta" style={{ margin: '8px 0 10px 0' }}>
											Koordinate:{' '}
											{addKpPos
												? `${addKpPos.lat.toFixed(5)}, ${addKpPos.lng.toFixed(5)}`
												: 'Klikni na mapu'}
										</p>
										<div style={{ display: 'flex', gap: '8px' }}>
											<button
												type="button"
												onClick={() => handleAddKeyPointToExistingTour(tour.id)}
												disabled={kpSaving}>
												{kpSaving ? 'Dodavanje...' : 'Dodaj ključnu tačku'}
											</button>
											<button
												type="button"
												onClick={() => {
													setAddTargetTourId(null);
													setAddKpPos(null);
													setAddKpName('');
													setAddKpDesc('');
													setAddKpImage('');
												}}
												disabled={kpSaving}>
												Otkaži
											</button>
										</div>
									</div>
								)}
							</div>
						))
					)}
				</article>
			)}

			{/* ══════════ ALL TOURS + REVIEWS ══════════ */}
			<article className="card">
				<h2>Sve ture</h2>
				<p className="meta" style={{ marginTop: 0 }}>
					Pregledaj sve ture i ostavi recenziju.
				</p>
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
							<div
								key={tour.id}
								style={{
									borderBottom: '1px solid #ddd',
									paddingBottom: '16px',
									marginBottom: '16px',
								}}>
								{/* Tour header */}
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'flex-start',
										gap: '12px',
									}}>
									<div style={{ flex: 1 }}>
										<h3 style={{ margin: '0 0 4px 0' }}>{tour.title}</h3>
										<p className="meta" style={{ margin: '0 0 4px 0' }}>
											Težina: {tour.difficulty}
											{Number(tour.review_count) > 0 && (
												<>
													{' '}
													&nbsp;|&nbsp; <StarDisplay
														value={tour.avg_rating}
													/>{' '}
													&nbsp;({tour.review_count} recenzij
													{Number(tour.review_count) === 1 ? 'a' : 'a'})
												</>
											)}
										</p>
										<p style={{ margin: '0 0 4px 0' }}>{tour.description}</p>
										{tour.tags?.length > 0 && (
											<p className="meta" style={{ margin: 0 }}>
												Tagovi: {tour.tags.join(', ')}
											</p>
										)}
									</div>
									<div
										style={{
											display: 'flex',
											flexDirection: 'column',
											gap: '6px',
											flexShrink: 0,
										}}>
										{tour.key_points?.length > 0 && (
											<button
												type="button"
												onClick={() =>
													setExpandedMapId(isMapOpen ? null : tour.id)
												}
												style={{ whiteSpace: 'nowrap' }}>
												{isMapOpen ? 'Zatvori mapu' : 'Mapa'}
											</button>
										)}
										<button
											type="button"
											onClick={() => handleToggleReviews(tour.id)}
											style={{ whiteSpace: 'nowrap' }}>
											{isReviewOpen
												? 'Zatvori'
												: `Recenzije${Number(tour.review_count) > 0 ? ` (${tour.review_count})` : ''}`}
										</button>
									</div>
								</div>

								{/* Map */}
								{isMapOpen && tour.key_points?.length > 0 && (
									<div
										style={{
											height: '260px',
											marginTop: '12px',
											borderRadius: '8px',
											overflow: 'hidden',
											border: '1px solid #ddd',
										}}>
										<MapContainer
											center={[
												tour.key_points[0].latitude,
												tour.key_points[0].longitude,
											]}
											zoom={13}
											style={{ height: '100%', width: '100%' }}>
											<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
											{tour.key_points?.length > 1 && (
												<Polyline
													positions={
														expandedMapRoutes[tour.id] ||
														tour.key_points.map((kp) => [
															kp.latitude,
															kp.longitude,
														])
													}
													pathOptions={{ color: '#1f7a8c', weight: 4 }}
												/>
											)}
											{tour.key_points.map((kp) => (
												<Marker
													key={kp.id}
													position={[kp.latitude, kp.longitude]}>
													<Popup>
														<strong>{kp.name}</strong>
														{kp.description && (
															<>
																<br />
																{kp.description}
															</>
														)}
														{kp.image_url && (
															<>
																<br />
																<img
																	src={kp.image_url}
																	alt={kp.name}
																	style={{
																		maxWidth: '120px',
																		marginTop: '4px',
																	}}
																/>
															</>
														)}
													</Popup>
												</Marker>
											))}
										</MapContainer>
									</div>
								)}

								{/* Reviews panel */}
								{isReviewOpen && (
									<div
										style={{
											marginTop: '14px',
											background: '#f9f9f9',
											borderRadius: '8px',
											padding: '14px',
										}}>
										{/* Existing reviews */}
										{reviews.length === 0 ? (
											<p className="meta" style={{ marginTop: 0 }}>
												Još nema recenzija. Budi prvi!
											</p>
										) : (
											<div style={{ marginBottom: '18px' }}>
												{reviews.map((r) => (
													<div
														key={r.id}
														style={{
															borderBottom: '1px solid #e8e8e8',
															paddingBottom: '12px',
															marginBottom: '12px',
														}}>
														<div
															style={{
																display: 'flex',
																justifyContent: 'space-between',
																alignItems: 'center',
																flexWrap: 'wrap',
																gap: '4px',
															}}>
															<strong>{r.tourist_name}</strong>
															<span
																style={{ color: '#f5a623', fontSize: '16px' }}>
																{'★'.repeat(r.rating)}
																{'☆'.repeat(5 - r.rating)}
															</span>
														</div>
														<p
															className="meta"
															style={{
																margin: '2px 0 6px 0',
																fontSize: '12px',
															}}>
															Poseta:{' '}
															{new Date(r.visit_date).toLocaleDateString(
																'sr-RS',
															)}
															&nbsp;|&nbsp; Objavljeno:{' '}
															{new Date(r.created_at).toLocaleDateString(
																'sr-RS',
															)}
														</p>
														{r.comment && (
															<p style={{ margin: '0 0 6px 0' }}>{r.comment}</p>
														)}
														{r.images?.length > 0 && (
															<div
																style={{
																	display: 'flex',
																	gap: '8px',
																	flexWrap: 'wrap',
																}}>
																{r.images.map((url, i) => (
																	<img
																		key={i}
																		src={url}
																		alt={`slika-${i + 1}`}
																		style={{
																			width: '80px',
																			height: '60px',
																			objectFit: 'cover',
																			borderRadius: '4px',
																			border: '1px solid #ddd',
																		}}
																	/>
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
												<label
													style={{
														display: 'block',
														fontSize: '0.85rem',
														marginBottom: '4px',
													}}>
													Ocena *
												</label>
												<StarPicker
													value={reviewRating}
													onChange={setReviewRating}
												/>
											</div>

											<div style={{ marginBottom: '10px' }}>
												<label
													style={{
														display: 'block',
														fontSize: '0.85rem',
														marginBottom: '4px',
													}}>
													Datum posete *
												</label>
												<input
													type="date"
													value={reviewVisitDate}
													onChange={(e) => setReviewVisitDate(e.target.value)}
													max={new Date().toISOString().split('T')[0]}
													style={{ width: '100%' }}
												/>
											</div>

											<div style={{ marginBottom: '10px' }}>
												<label
													style={{
														display: 'block',
														fontSize: '0.85rem',
														marginBottom: '4px',
													}}>
													Komentar
												</label>
												<textarea
													placeholder="Kako je bilo na turi?"
													rows={3}
													value={reviewComment}
													onChange={(e) => setReviewComment(e.target.value)}
													style={{ width: '100%', resize: 'vertical' }}
												/>
											</div>

											<div style={{ marginBottom: '12px' }}>
												<label
													style={{
														display: 'block',
														fontSize: '0.85rem',
														marginBottom: '4px',
													}}>
													Slike (URL)
												</label>
												{reviewImages.map((url, i) => (
													<div
														key={i}
														style={{
															display: 'flex',
															gap: '6px',
															marginBottom: '6px',
														}}>
														<input
															placeholder="https://... URL slike"
															value={url}
															onChange={(e) =>
																updateImageUrl(i, e.target.value)
															}
															style={{ flex: 1 }}
														/>
														{i > 0 && (
															<button
																type="button"
																onClick={() =>
																	setReviewImages((prev) =>
																		prev.filter((_, j) => j !== i),
																	)
																}
																style={{
																	padding: '0 8px',
																	background: '#e55',
																	color: '#fff',
																	border: 'none',
																	borderRadius: '4px',
																	cursor: 'pointer',
																}}>
																×
															</button>
														)}
													</div>
												))}
												<button
													type="button"
													onClick={() =>
														setReviewImages((prev) => [...prev, ''])
													}
													style={{ fontSize: '0.85rem', padding: '4px 10px' }}>
													+ Dodaj sliku
												</button>
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
