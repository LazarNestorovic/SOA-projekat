package main

import (
	"api-gateway/client"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"strings"
	"time"

	"api-gateway/pb"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var routes = map[string]string{
	"/api/blogs":        "http://blog-service:8083",
	"/api/stakeholders": "http://stakeholder-service:8082",
	"/api/followers":    "http://follower-service:8084",
	"/api/tours":        "http://tour-service:8085",
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

func writeJSONError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func getUserContextValue(r *http.Request) (uint, string, bool) {
	userID, ok := r.Context().Value("userID").(uint)
	if !ok {
		return 0, "", false
	}
	role, _ := r.Context().Value("role").(string)
	return userID, role, true
}

func tourRPCHandler(w http.ResponseWriter, r *http.Request) {
	tourClient := client.NewTourClient()

	if r.URL.Path == "/api/tours" && r.Method == http.MethodPost {
		userID, _, ok := getUserContextValue(r)
		if !ok {
			writeJSONError(w, http.StatusUnauthorized, "Nedostaje korisnički kontekst")
			return
		}

		var payload struct {
			Title          string         `json:"title"`
			Description    string         `json:"description"`
			Difficulty     string         `json:"difficulty"`
			Tags           []string       `json:"tags"`
			Price          float64        `json:"price"`
			TransportTimes map[string]uint32 `json:"transport_times"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil && err != io.EOF {
			writeJSONError(w, http.StatusBadRequest, "Neispravan JSON payload")
			return
		}

		resp, err := tourClient.CreateTour(r.Context(), &pb.CreateTourRequest{
			UserId:         uint32(userID),
			Title:          payload.Title,
			Description:    payload.Description,
			Difficulty:     payload.Difficulty,
			Tags:           payload.Tags,
			Price:          payload.Price,
			TransportTimes: payload.TransportTimes,
		})
		if err != nil {
			if st, ok := status.FromError(err); ok {
				switch st.Code() {
				case codes.InvalidArgument:
					writeJSONError(w, http.StatusBadRequest, st.Message())
				default:
					writeJSONError(w, http.StatusInternalServerError, st.Message())
				}
				return
			}
			writeJSONError(w, http.StatusInternalServerError, err.Error())
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(resp)
		return
	}

	if r.URL.Path == "/api/tours/published" && r.Method == http.MethodGet {
		userID, _, _ := getUserContextValue(r)
		resp, err := tourClient.GetPublishedTours(r.Context(), &pb.GetPublishedToursRequest{UserId: uint32(userID)})
		if err != nil {
			if st, ok := status.FromError(err); ok {
				writeJSONError(w, http.StatusInternalServerError, st.Message())
				return
			}
			writeJSONError(w, http.StatusInternalServerError, err.Error())
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp.Tours)
		return
	}

	if strings.HasPrefix(r.URL.Path, "/api/tours/") && r.Method == http.MethodGet {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) == 3 {
			id, err := strconv.Atoi(parts[2])
			if err == nil {
				resp, err := tourClient.GetTour(r.Context(), &pb.GetTourRequest{Id: uint32(id)})
				if err != nil {
					if st, ok := status.FromError(err); ok {
						switch st.Code() {
						case codes.NotFound:
							writeJSONError(w, http.StatusNotFound, st.Message())
						default:
							writeJSONError(w, http.StatusInternalServerError, st.Message())
						}
						return
					}
					writeJSONError(w, http.StatusInternalServerError, err.Error())
					return
				}
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(resp)
				return
			}
		}
	}

	if strings.HasPrefix(r.URL.Path, "/api/tours/") && strings.HasSuffix(r.URL.Path, "/status") && r.Method == http.MethodPatch {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) != 4 {
			writeJSONError(w, http.StatusNotFound, "Ruta nije pronađena")
			return
		}

		id, err := strconv.Atoi(parts[2])
		if err != nil {
			writeJSONError(w, http.StatusBadRequest, "Neispravan ID ture")
			return
		}

		userID, role, ok := getUserContextValue(r)
		if !ok {
			writeJSONError(w, http.StatusUnauthorized, "Nedostaje korisnički kontekst")
			return
		}

		var payload struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil && err != io.EOF {
			writeJSONError(w, http.StatusBadRequest, "Neispravan JSON payload")
			return
		}

		resp, err := tourClient.UpdateTourStatus(r.Context(), &pb.UpdateTourStatusRequest{
			Id:     uint32(id),
			UserId: uint32(userID),
			Role:   role,
			Status: payload.Status,
		})
		if err != nil {
			if st, ok := status.FromError(err); ok {
				switch st.Code() {
				case codes.InvalidArgument:
					writeJSONError(w, http.StatusBadRequest, st.Message())
				case codes.NotFound:
					writeJSONError(w, http.StatusNotFound, st.Message())
				case codes.PermissionDenied:
					writeJSONError(w, http.StatusForbidden, st.Message())
				default:
					writeJSONError(w, http.StatusInternalServerError, st.Message())
				}
				return
			}
			writeJSONError(w, http.StatusInternalServerError, err.Error())
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}

	proxyHandler(w, r)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
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
	tourProtectedHandler := authMiddleware(http.HandlerFunc(tourRPCHandler))

	mux.Handle("/api/blogs/", protectedHandler)
	mux.Handle("/api/stakeholders/", protectedHandler)
	mux.Handle("/api/followers/", protectedHandler)
	mux.Handle("/api/tours", tourProtectedHandler)
	mux.Handle("/api/tours/", tourProtectedHandler)

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
