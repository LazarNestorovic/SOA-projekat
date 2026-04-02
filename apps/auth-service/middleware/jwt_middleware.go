package middleware

import (
	"auth-service/utils"
	"context"
	"net/http"
	"strings"
)

// JWTMiddleware validira JWT token
func JWTMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// Ekstraktuj token iz header-a
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Nedostaje Authorization header", http.StatusUnauthorized)
			return
		}

		// Pročitaj "Bearer" token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Nevažeći Authorization header format", http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		// Verifikuj token
		claims, err := utils.VerifyToken(tokenString)
		if err != nil {
			http.Error(w, "Nevažeći token: "+err.Error(), http.StatusUnauthorized)
			return
		}

		// Postavi podatke iz tokena u kontekst
		ctx := context.WithValue(r.Context(), "userID", claims.UserID)
		ctx = context.WithValue(ctx, "username", claims.Username)
		ctx = context.WithValue(ctx, "email", claims.Email)
		ctx = context.WithValue(ctx, "role", string(claims.Role))

		// Prosleđi zahtev sa novim kontekstom
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
