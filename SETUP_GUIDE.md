# Brz početak - Auth Service

## 1. PostgreSQL konfiguracija

Prvo, kreiraj PostgreSQL bazu:

```bash
# Na Linux/Mac
createdb auth_service

# Na Windows (u PostgreSQL prompt-u)
CREATE DATABASE auth_service;
```

## 2. Primeni SQL migracije

```bash
psql -U postgres auth_service < apps/auth-service/migrations/001_create_users.sql
```

## 3. Instaliraj zavisnosti i pokreni

```bash
cd apps/auth-service

# Preuzmi Go module
go mod download

# Pokreni seedovanje (kreiraj admin korisnike)
go run cmd/seed/main.go

# Pokreni auth service
go run main.go
```

Service će biti dostupan na **http://localhost:8081**

---

## Quick Test sa cURL

### 1. Registruj Vodiča

```bash
curl -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jovan_vodic",
    "email": "jovan@example.com",
    "password": "lozinka123",
    "role": "vodic"
  }'
```

### 2. Registruj Turista

```bash
curl -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ana_turista",
    "email": "ana@example.com",
    "password": "lozinka123",
    "role": "turista"
  }'
```

### 3. Prijava

```bash
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jovan@example.com",
    "password": "lozinka123"
  }'
```

Kopuraj `token` iz odgovora.

### 4. Pristup zaštićenim rutama

```bash
curl -X GET http://localhost:8081/api/me \
  -H "Authorization: Bearer TOKEN_OVDE"
```

---

## Struktura baze

Tabela `users` ima sledeće kolone:
- `id` - ID korisnika (PRIMARY KEY)
- `username` - Jedinstveno korisničko ime
- `email` - Jedinstveni mejl
- `password` - Heširana lozinka (bcrypt)
- `role` - Uloga (admin, vodic, turista)
- `created_at` - Vremenska oznaka kreiranja
- `updated_at` - Vremenska oznaka ažuriranja

---

## Dozvoljene uloge

| Uloga | Registracija | Napomena |
|-------|-------------|----------|
| vodic | ✅ | Vodič turista |
| turista | ✅ | Turista |
| admin | ❌ | Samo direktno u bazu |

---

## Troubleshooting

### Problem: "connection refused"
Proveri da li je PostgreSQL pokrenut.

### Problem: "database does not exist"
Proveri da li je baza kreirana:
```bash
psql -U postgres -l | grep auth_service
```

### Problem: "tables do not exist"
Primeni migracije:
```bash
psql -U postgres auth_service < apps/auth-service/migrations/001_create_users.sql
```
