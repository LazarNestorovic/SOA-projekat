import React, { useState, useEffect, useCallback } from 'react';
import { getPublishedTours, addToCart } from '../../services/tourService';

function StarDisplay({ value }) {
	return (
		<span style={{ color: '#f5a623', fontSize: '14px' }}>
			{'★'.repeat(Math.round(value))}
			{'☆'.repeat(5 - Math.round(value))}
			<span style={{ color: '#66768e', marginLeft: 4, fontSize: '12px' }}>
				{Number(value).toFixed(1)}
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

function TourCard({ tour, token, onCartUpdate, onNotice, onError }) {
	const [adding, setAdding] = useState(false);

	const handleAdd = async () => {
		setAdding(true);
		try {
			await addToCart(token, tour.id);
			onCartUpdate();
			onNotice(`"${tour.title}" dodata u korpu`, 'success');
		} catch (err) {
			onError(err);
		} finally {
			setAdding(false);
		}
	};

	return (
		<div className="card" style={{ display: 'grid', gap: '10px' }}>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'flex-start',
					gap: 12,
				}}>
				<div>
					<h3 style={{ marginBottom: 4, fontSize: '16px' }}>{tour.title}</h3>
					<span
						style={{
							fontSize: '11px',
							fontWeight: 700,
							textTransform: 'uppercase',
							letterSpacing: '0.08em',
							color: '#0a6f66',
							background: 'rgba(13,148,136,0.1)',
							borderRadius: 999,
							padding: '2px 8px',
						}}>
						{tour.difficulty}
					</span>
				</div>
				<div style={{ textAlign: 'right', flexShrink: 0 }}>
					<div style={{ fontSize: '20px', fontWeight: 800, color: '#0d9488' }}>
						{Number(tour.price) === 0
							? 'Besplatno'
							: `€${Number(tour.price).toFixed(2)}`}
					</div>
				</div>
			</div>

			<p style={{ color: '#415470', fontSize: '14px', lineHeight: 1.6 }}>
				{tour.description}
			</p>

			{tour.starting_point && (
				<div
					style={{
						fontSize: '13px',
						color: '#66768e',
						display: 'flex',
						alignItems: 'center',
						gap: 6,
					}}>
					<span>📍</span>
					<span>
						Prva ključna tačka:{' '}
						<strong style={{ color: '#243551' }}>
							{tour.starting_point.name}
						</strong>
					</span>
				</div>
			)}

			<div
				style={{
					fontSize: '12px',
					color: '#66768e',
					display: 'flex',
					flexWrap: 'wrap',
					gap: 10,
				}}>
				<span>Objavljena: {formatDateTime(tour.published_at)}</span>
				{tour.distance_km !== undefined && tour.distance_km !== null && (
					<span>Dužina: {Number(tour.distance_km).toFixed(2)} km</span>
				)}
			</div>

			{Number(tour.review_count) > 0 && (
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					<StarDisplay value={tour.avg_rating} />
					<span style={{ fontSize: '12px', color: '#66768e' }}>
						({tour.review_count} recenzija)
					</span>
				</div>
			)}

			{tour.tags && tour.tags.length > 0 && (
				<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
					{tour.tags.map((tag) => (
						<span
							key={tag}
							style={{
								fontSize: '11px',
								background: '#f0f7ff',
								color: '#2e5f9e',
								borderRadius: 999,
								padding: '3px 9px',
								border: '1px solid #c8ddf5',
							}}>
							{tag}
						</span>
					))}
				</div>
			)}

			<div style={{ marginTop: 4 }}>
				{tour.is_purchased ? (
					<span
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 6,
							color: '#10b981',
							fontWeight: 700,
							fontSize: '13px',
						}}>
						✓ Kupljeno
					</span>
				) : tour.in_cart ? (
					<span
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 6,
							color: '#f59e0b',
							fontWeight: 700,
							fontSize: '13px',
						}}>
						⏳ U korpi
					</span>
				) : (
					<button
						onClick={handleAdd}
						disabled={adding}
						style={{ minWidth: 130 }}>
						{adding ? 'Dodajem...' : '+ Dodaj u korpu'}
					</button>
				)}
			</div>
		</div>
	);
}

function TourBrowsePanel({ token, onCartUpdate, onNotice, onError, active }) {
	const [tours, setTours] = useState([]);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const data = await getPublishedTours(token);
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
				<h2 style={{ fontFamily: 'Playfair Display, serif', margin: 0 }}>
					Objavljene ture
				</h2>
				<button
					className="ghost"
					onClick={load}
					disabled={loading}
					style={{ minWidth: 90 }}>
					{loading ? 'Učitavam...' : 'Osveži'}
				</button>
			</div>

			{loading && tours.length === 0 ? (
				<p className="meta" style={{ textAlign: 'center', padding: '32px 0' }}>
					Učitavam ture...
				</p>
			) : tours.length === 0 ? (
				<p className="meta" style={{ textAlign: 'center', padding: '32px 0' }}>
					Nema objavljenih tura.
				</p>
			) : (
				<div style={{ display: 'grid', gap: 14 }}>
					{tours.map((tour) => (
						<TourCard
							key={tour.id}
							tour={tour}
							token={token}
							onCartUpdate={() => {
								onCartUpdate();
								load();
							}}
							onNotice={onNotice}
							onError={onError}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export default TourBrowsePanel;
