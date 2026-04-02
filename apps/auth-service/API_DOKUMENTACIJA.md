# Auth Service - API Dokumentacija

## Pregled

Auth Service je microservice za autentifikaciju i upravljanje korisnicima sa sledećim mogućnostima:
- Registracija novih korisnika (uloga: Vodič ili Turista)
- Prijava korisnika
- JWT token validacija
- Admin korisnici se ubacuju direktno u bazu

## Arhitektura

```
Model ─────→ Repository ─────→ Service ─────→ Handler
               (Baza)                          (HTTP)
```

## Uslovi

- Go 1.21+
- PostgreSQL 12+

## Instalacija

### 1. Kreiraj PostgreSQL bazu

```bash
createdb auth_service
```

### 2. Primeni migracije

```bash
psql auth_service < migrations/001_create_users.sql
```

### 3. Instaliraj Go dependency-e

```bash
cd apps/auth-service
go mod download
```

### 4. Seeduj admin korisnike (opciono)

```bash
go run cmd/seed/main.go
```

## Pokretanje

```bash
go run main.go
```

Server će biti dostupan na `http://localhost:8081`

## API Endpoints

### Javne rute (bez autentifikacije)

#### 1. Registracija novog korisnika
- **Metoda**: POST
- **URL**: `/auth/register`
- **Body**:
```json
{
  "username": "marko",
  "email": "marko@example.com",
  "password": "lozinka123",
  "role": "vodic"
}
```
- **Odgovori**:
  - `201`: Korisnik uspešno registrovan
  - `400`: Greška u validaciji

**Dozvoljene uloge za registraciju**: 
- `vodic` - Vodič
- `turista` - Turista

#### 2. Prijava korisnika
- **Metoda**: POST
- **URL**: `/auth/login`
- **Body**:
```json
{
  "email": "marko@example.com",
  "password": "lozinka123"
}
```
- **Odgovori**:
  - `200`: Uspešan login, vraća token i podatke korisnika
  - `401`: Nevalidne kredencijale

### Zaštićene rute (zahtevaju JWT token)

Svaki zahtev ka zaštićenim rutama mora imati Authorization header:
```
Authorization: Bearer <token>
```

#### 3. Dobijanje podataka trenutnog korisnika
- **Metoda**: GET
- **URL**: `/api/me`
- **Odgovori**:
  - `200`: Podaci korisnika
  - `401`: Nevalidni token

#### 4. Dobijanje podataka korisnika po ID-u
- **Metoda**: GET
- **URL**: `/api/users/{id}`
- **Parametri**: 
  - `id` - ID korisnika
- **Odgovori**:
  - `200`: Podaci korisnika
  - `404`: Korisnik nije pronađen
  - `401`: Nevalidni token

## Primeri korišćenja

### Registracija Vodiča

```bash
curl -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "marko_vodic",
    "email": "marko@example.com",
    "password": "lozinka123",
    "role": "vodic"
  }'
```

Odgovori:
```json
{
  "message": "Korisnik uspešno registrovan",
  "user": {
    "id": 1,
    "username": "marko_vodic",
    "email": "marko@example.com",
    "role": "vodic",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Prijava

```bash
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "marko@example.com",
    "password": "lozinka123"
  }'
```

Odgovori:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "marko_vodic",
    "email": "marko@example.com",
    "role": "vodic",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Dobijanje podataka korisnika

```bash
curl -X GET http://localhost:8081/api/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Struktura projekta

```
auth-service/
├── main.go                 # Glavna aplikacija
├── go.mod                  # Go dependencies
├── model/
│   ├── user.go            # Strukture za korisnike
│   └── response.go        # Strukture za odgovore
├── repository/
│   └── user_repository.go # Pristup bazi podataka
├── service/
│   └── auth_service.go    # Poslovna logika
├── handler/
│   └── auth_handler.go    # HTTP handler-i (kontroleri)
├── middleware/
│   └── jwt_middleware.go  # JWT validacija
├── utils/
│   ├── password.go        # Šifrovanje lozinki
│   └── jwt.go             # JWT token funkcionalnost
├── config/
│   └── database.go        # Konfiguracija baze
├── migrations/
│   └── 001_create_users.sql # SQL migracije
└── cmd/
    └── seed/
        └── main.go        # Seedovanje baze sa admin korisnicima
```

## Šifrovanje lozinke

Lozinke se heširaju korišćenjem bcrypt algoritma sa DefaultCost (10). Nikada se lozinka ne čuva u plaintext-u.

## JWT Token

- **Trajanje**: 24 sata
- **Sadržaj**: UserID, Username, Email, Role
- **Algoritam**: HS256

## Greške

Sve greške se vraćaju sa odgovarajućim HTTP status kodovima:
- `400 Bad Request` - Greška u zahtetu ili validaciji
- `401 Unauthorized` - Nevalidne kredencijale ili token
- `404 Not Found` - Resurs nije pronađen
- `500 Internal Server Error` - Greška na serveru

## Zaštita

- Lozinke su heširane sa bcrypt
- JWT token je zaštičen tajnim ključem (trebalo bi da bude čuvan u environment varijablama)
- Zaštićene rute zahtevaju validan JWT token

## Budući razvoj

- Osvežavanje tokena (refresh token)
- Dvostruka autentifikacija
- Uloge i dozvole (permissions)
- Logging svih akcija
- Rate limiting
