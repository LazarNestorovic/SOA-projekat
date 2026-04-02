# SOA Projekat - Čitaj Me Prvo

## 📋 Pregled projekta

Ovo je SOA (Service-Oriented Architecture) projekat sa microservices-ima u Go-u. Trenutno je implementiran **Auth Service** sa sledećim mogućnostima:

✅ Registracija korisnika (Vodič, Turista)  
✅ Prijava korisnika  
✅ JWT autentifikacija  
✅ Admin korisnici (insertovani direktno u bazu)  
✅ PostgreSQL baza podataka  

## 🏗 Arhitektura

```
Model → Repository → Service → Handler/Controller
               ↓
           PostgreSQL
```

Svaka komponenta ima jasnu odgovornost:
- **Model**: Strukture podataka
- **Repository**: Pristup bazi podataka (CRUD operacije)
- **Service**: Poslovna logika i validacija
- **Handler/Controller**: HTTP API endpoint-i

## 📁 Struktura projekta

```
SOA-projekat/
├── apps/
│   ├── auth-service/          # Auth Service
│   │   ├── model/             # User strukture
│   │   ├── repository/        # Baza podataka pristup
│   │   ├── service/           # Poslovna logika
│   │   ├── handler/           # HTTP Handler-i
│   │   ├── middleware/        # JWT middleware
│   │   ├── utils/             # Pomoćne funkcije
│   │   ├── config/            # Konfiguracija
│   │   ├── migrations/        # SQL migracije
│   │   ├── cmd/seed/          # Seedovanje baze
│   │   ├── main.go            # Glavna aplikacija
│   │   └── Dockerfile         # Docker slika
│   ├── blog-service/          # (Budući)
│   └── stakeholder-service/   # (Budući)
├── docker-compose.yml         # Docker kompozicija
├── SETUP_GUIDE.md             # Brz početak
├── API_DOKUMENTACIJA.md       # API referenca
└── README.md                  # Ovaj fajl
```

## 🚀 Brz početak

### Korak 1: PostgreSQL

```bash
# Kreiraj bazu
createdb auth_service
```

### Korak 2: Migracije

```bash
psql -U postgres auth_service < apps/auth-service/migrations/001_create_users.sql
```

### Korak 3: Pokretanje

```bash
cd apps/auth-service
go run main.go
```

Service je dostupan na `http://localhost:8081`

## 📚 Dokumentacija

- [Setup Guide](./SETUP_GUIDE.md) - Detaljne instrukcije za pokretanje
- [API Dokumentacija](./apps/auth-service/API_DOKUMENTACIJA.md) - Kompletan API reference
- [Postman Kolekcija](./Auth_Service_API.postman_collection.json) - Za testiranje API-ja

## 🔑 Ključne karakteristike

### 1. **Registracija korisnika**
- Korisničko ime, mejl, lozinka, uloga
- Dozvoljene uloge: `vodic`, `turista`
- Lozinka se heširuje sa bcrypt
- Email i korisničko ime su jedinstveni

### 2. **Prijava**
- JWT token (važi 24h)
- Vraća korisničke podatke i token

### 3. **Zaštićene rute**
- Zahtevaju JWT token u `Authorization` header-u
- Bearer token format: `Authorization: Bearer <token>`

### 4. **Admin korisnici**
- Ubacuju se direktno u bazu (nisu dostupni kroz API)
- Uloga: `admin`

## 🗄 PostgreSQL baza

Tabela `users`:
```sql
id          SERIAL PRIMARY KEY
username    VARCHAR(255) UNIQUE NOT NULL
email       VARCHAR(255) UNIQUE NOT NULL
password    VARCHAR(255) NOT NULL (bcrypt hash)
role        VARCHAR(50) NOT NULL (admin, vodic, turista)
created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

## 🐳 Docker pokretanje

```bash
docker-compose up -d
```

Ovo će pokrenuti PostgreSQL i Auth Service kontejnere.

## 📌 API Primeri

### Registracija
```bash
curl -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "marko",
    "email": "marko@example.com",
    "password": "lozinka123",
    "role": "vodic"
  }'
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

### Pristup zaštićenoj ruti
```bash
curl -X GET http://localhost:8081/api/me \
  -H "Authorization: Bearer <TOKEN>"
```

## ⚙ Konfiguracija

Kreiraj `.env` fajl u `apps/auth-service/`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=auth_service
JWT_SECRET=your-secret-key
```

Ili koristi `.env.example` kao Template.

## 📦 Dependencies

```
github.com/golang-jwt/jwt/v5      - JWT tokenizacija
github.com/gorilla/mux            - HTTP Router
github.com/lib/pq                 - PostgreSQL driver
golang.org/x/crypto               - Bcrypt šifrovanje
```

## 🔐 Bezbednost

✅ Lozinke heširane sa bcrypt  
✅ JWT token za autentifikaciju  
✅ Zaštićene rute middleware-om  
✅ Email i username validacija  
✅ CORS će biti dodan ako je potreban

## 📝 Budući razvoj

- [ ] Osvežavanje tokena (refresh token)
- [ ] Dvostruka autentifikacija (2FA)
- [ ] Uloge i dozvole (permissions)
- [ ] Logging svih akcija
- [ ] Rate limiting
- [ ] Email verifikacija
- [ ] Password reset
- [ ] Blog Service
- [ ] Stakeholder Service

## 🤝 Kontribucija

Svaka komponenta je pisana da bude modularna i proširiva.

## ❓ Troubleshooting

**Problem**: PostgreSQL connection refused
```bash
# Proveri da li je PostgreSQL pokrenut
psql -U postgres -l
```

**Problem**: "database does not exist"
```bash
createdb auth_service
```

**Problem**: Migracije ne rade
```bash
psql -U postgres auth_service < apps/auth-service/migrations/001_create_users.sql
```

**Problem**: Go module greške
```bash
cd apps/auth-service
go mod tidy
go mod download
```

## 📧 Kontakt

Za pitanja ili probleme, kreiraj GitHub issue.

---

**Verzija**: 1.0.0  
**Go verzija**: 1.26.1  
**Database**: PostgreSQL 12+