# Monitoring

## Pokretanje

```bash
docker compose up -d
docker compose -f docker-compose.monitoring.yml up -d
```

## Alati

| Alat | URL | Kredencijali |
|------|-----|--------------|
| Grafana (metrike + logovi) | http://localhost:3001 | admin / admin |
| Prometheus (sirove metrike) | http://localhost:9090 | — |
| Jaeger (tracing) | http://localhost:16686 | — |

## Grafana — metrike
Dashboards → izaberi dashboard → podaci se učitavaju automatski.

## Grafana — logovi
Explore → izaberi **Loki** → query: `{job="docker"}`

## Isključivanje

```bash
docker compose down
docker compose -f docker-compose.monitoring.yml down
```

> **Napomena:** Ne koristiti `down -v` — briše sačuvane dashboard-e.
