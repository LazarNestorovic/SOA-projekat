# Stakeholder Service - API Dokumentacija

## Pregled

Stakeholder Service omogućava administratorima da pregledaju sve korisnike sistema, uključujući njihove osnovne informacije bez prikaza lozinki.

## Endpoints

### 1. Pregled svih korisnika (Admin-only)

**Request:**
```
GET /api/users
Authorization: Bearer <JWT_TOKEN>
```

**Headers:**
- `Authorization: Bearer <JWT_TOKEN>` - JWT token administratora

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": 1,
      "username": "admin_user",
      "role": "admin",
      "email": "admin@example.com",
      "created_at": "2024-01-10T10:00:00Z"
    },
    {
      "id": 2,
      "username": "guide_user",
      "role": "vodic",
      "email": "vodic@example.com",
      "created_at": "2024-01-10T11:00:00Z"
    }
  ]
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Neautentifikovan korisnik"
}
```

**Response (403 Forbidden):**
```json
{
  "error": "Samo admin može videti sve korisnike"
}
```

## Napomene

- Lozinke korisnika se nikada ne prikazuju
- Samo administratori mogu pristupiti ovom endpointu
- Zahtev mora sadržavati validan JWT token
- Service se pokreće na portu 8082
