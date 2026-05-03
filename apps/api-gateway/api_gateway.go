package main

import (
	"api-gateway/client"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"
)

var routes = map[string]string{
	"/api/blogs":        "http://blog-service:8083",
	"/api/stakeholders": "http://stakeholder-service:8082",
	"/api/followers":    "http://follower-service:8084",
}

func authMiddleware(next http.Handler) http.Handler {
	authClient := client.NewAuthClient()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Nedostaje Authorization header",
			})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Nevažeći Authorization header format",
			})
			return
		}

		claims, err := authClient.ValidateToken(r.Context(), tokenString)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Nevažeći token",
			})
			return
		}

		ctx := context.WithValue(r.Context(), "userID", claims.UserID)
		ctx = context.WithValue(ctx, "username", claims.Username)
		ctx = context.WithValue(ctx, "email", claims.Email)
		ctx = context.WithValue(ctx, "role", claims.Role)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func proxyHandler(w http.ResponseWriter, r *http.Request) {
	var targetURL string

	for path, target := range routes {
		if strings.HasPrefix(r.URL.Path, path) {
			targetURL = target
			break
		}
	}

	if targetURL == "" {
		http.Error(w, "Ruta nije pronađena", http.StatusNotFound)
		return
	}

	target, _ := url.Parse(targetURL)
	proxy := httputil.NewSingleHostReverseProxy(target)

	if userID, ok := r.Context().Value("userID").(uint); ok {
		r.Header.Set("X-User-ID", fmt.Sprintf("%d", userID))
		r.Header.Set("X-User-Role", r.Context().Value("role").(string))
	}

	r.Host = target.Host
	proxy.ServeHTTP(w, r)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	mux := http.NewServeMux()

	mux.Handle("/api/stakeholders/auth/login", http.HandlerFunc(proxyHandler))
	mux.Handle("/api/stakeholders/auth/register", http.HandlerFunc(proxyHandler))

	protectedHandler := authMiddleware(http.HandlerFunc(proxyHandler))

	mux.Handle("/api/blogs/", protectedHandler)
	mux.Handle("/api/stakeholders/", protectedHandler)
	mux.Handle("/api/followers/", protectedHandler)

	finalHandler := corsMiddleware(mux)

	server := &http.Server{
		Addr:         ":8080",
		Handler:      finalHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	fmt.Println("🚀 API Gateway pokrenut na portu :8080")
	log.Fatal(server.ListenAndServe())
}
