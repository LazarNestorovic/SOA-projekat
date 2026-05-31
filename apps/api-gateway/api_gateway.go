package main

import (
	"api-gateway/client"
	"bytes"
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
			Title          string            `json:"title"`
			Description    string            `json:"description"`
			Difficulty     string            `json:"difficulty"`
			Tags           []string          `json:"tags"`
			Price          float64           `json:"price"`
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

type bookingResponse struct {
	ID     uint   `json:"id"`
	TourID uint   `json:"tour_id"`
	UserID uint   `json:"user_id"`
	Status string `json:"status"`
	Price  string `json:"price"`
}

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type registerResponse struct {
	Message string `json:"message"`
	User    struct {
		ID       uint   `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
		Role     string `json:"role"`
	} `json:"user"`
}

type issueTokenRequest struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

type issueTokenResponse struct {
	Token string `json:"token"`
}

func doJSONRequest(client *http.Client, method, url string, body any, headers map[string]string) (*http.Response, []byte, error) {
	var payload io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, nil, err
		}
		payload = bytes.NewReader(encoded)
	}

	req, err := http.NewRequest(method, url, payload)
	if err != nil {
		return nil, nil, err
	}
	for k, v := range headers {
		if v != "" {
			req.Header.Set(k, v)
		}
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp, nil, err
	}

	return resp, respBody, nil
}

func extractTourID(path string) (string, bool) {
	prefix := "/api/sagas/tours/"
	if !strings.HasPrefix(path, prefix) {
		return "", false
	}
	remaining := strings.TrimPrefix(path, prefix)
	parts := strings.Split(remaining, "/")
	if len(parts) < 2 || parts[1] != "book" || parts[0] == "" {
		return "", false
	}
	return parts[0], true
}

func bookTourSagaHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("userID").(uint)
	if !ok || userID == 0 {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Neautentifikovan korisnik"})
		return
	}

	tourID, ok := extractTourID(r.URL.Path)
	if !ok {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Ruta nije pronađena"})
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	authHeader := r.Header.Get("Authorization")
	roleHeader, _ := r.Context().Value("role").(string)
	headers := map[string]string{
		"Authorization": authHeader,
		"X-User-ID":     fmt.Sprintf("%d", userID),
		"X-User-Role":   roleHeader,
	}

	bookingURL := fmt.Sprintf("http://tour-service:8085/api/tours/%s/bookings", tourID)
	resp, respBody, err := doJSONRequest(client, http.MethodPost, bookingURL, map[string]string{}, headers)
	if err != nil {
		w.WriteHeader(http.StatusBadGateway)
		json.NewEncoder(w).Encode(map[string]string{"error": "Greška pri kreiranju rezervacije"})
		return
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		w.WriteHeader(resp.StatusCode)
		w.Write(respBody)
		return
	}

	var booking bookingResponse
	if err := json.Unmarshal(respBody, &booking); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Nevažeći odgovor rezervacije"})
		return
	}

	price, err := strconv.ParseFloat(booking.Price, 64)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Nevažeći iznos rezervacije"})
		return
	}

	debitURL := "http://stakeholder-service:8082/api/stakeholders/balance/debit"
	debitBody := map[string]float64{"amount": price}
	resp, respBody, err = doJSONRequest(client, http.MethodPost, debitURL, debitBody, headers)
	if err != nil || resp.StatusCode < 200 || resp.StatusCode >= 300 {
		cancelURL := fmt.Sprintf("http://tour-service:8085/api/tours/bookings/%d/status", booking.ID)
		_, _, _ = doJSONRequest(client, http.MethodPatch, cancelURL, map[string]string{"status": "cancelled"}, headers)

		status := http.StatusBadGateway
		if resp != nil {
			status = resp.StatusCode
		}
		w.WriteHeader(status)
		if len(respBody) > 0 {
			w.Write(respBody)
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"error": "Greška pri naplati"})
		return
	}

	confirmURL := fmt.Sprintf("http://tour-service:8085/api/tours/bookings/%d/status", booking.ID)
	resp, respBody, err = doJSONRequest(client, http.MethodPatch, confirmURL, map[string]string{"status": "confirmed"}, headers)
	if err != nil || resp.StatusCode < 200 || resp.StatusCode >= 300 {
		refundURL := "http://stakeholder-service:8082/api/stakeholders/balance/credit"
		_, _, _ = doJSONRequest(client, http.MethodPost, refundURL, debitBody, headers)

		status := http.StatusBadGateway
		if resp != nil {
			status = resp.StatusCode
		}
		w.WriteHeader(status)
		if len(respBody) > 0 {
			w.Write(respBody)
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"error": "Greška pri potvrdi rezervacije"})
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(respBody)
}

func registerSagaHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Nevažeći zahtev"})
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	registerURL := "http://stakeholder-service:8082/api/stakeholders/auth/register"
	resp, respBody, err := doJSONRequest(client, http.MethodPost, registerURL, req, map[string]string{})
	if err != nil {
		w.WriteHeader(http.StatusBadGateway)
		json.NewEncoder(w).Encode(map[string]string{"error": "Greška pri registraciji"})
		return
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		w.WriteHeader(resp.StatusCode)
		w.Write(respBody)
		return
	}

	var registerResp registerResponse
	if err := json.Unmarshal(respBody, &registerResp); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Nevažeći odgovor registracije"})
		return
	}

	issueURL := "http://auth-service:8081/token/issue"
	issueBody := issueTokenRequest{
		UserID:   registerResp.User.ID,
		Username: registerResp.User.Username,
		Email:    registerResp.User.Email,
		Role:     registerResp.User.Role,
	}
	resp, respBody, err = doJSONRequest(client, http.MethodPost, issueURL, issueBody, map[string]string{})
	if err != nil || resp.StatusCode < 200 || resp.StatusCode >= 300 {
		deleteURL := fmt.Sprintf("http://stakeholder-service:8082/internal/users/%d", registerResp.User.ID)
		_, _, _ = doJSONRequest(client, http.MethodDelete, deleteURL, nil, map[string]string{})

		status := http.StatusBadGateway
		if resp != nil {
			status = resp.StatusCode
		}
		w.WriteHeader(status)
		if len(respBody) > 0 {
			w.Write(respBody)
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"error": "Greška pri generisanju tokena"})
		return
	}

	var tokenResp issueTokenResponse
	if err := json.Unmarshal(respBody, &tokenResp); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Nevažeći odgovor tokena"})
		return
	}

	response := map[string]any{
		"token": tokenResp.Token,
		"user":  registerResp.User,
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func main() {
	mux := http.NewServeMux()

	mux.Handle("/api/stakeholders/auth/login", http.HandlerFunc(proxyHandler))
	mux.Handle("/api/stakeholders/auth/register", http.HandlerFunc(proxyHandler))
	mux.Handle("/api/sagas/register", http.HandlerFunc(registerSagaHandler))

	protectedHandler := authMiddleware(http.HandlerFunc(proxyHandler))
	protectedSagaHandler := authMiddleware(http.HandlerFunc(bookTourSagaHandler))
	tourProtectedHandler := authMiddleware(http.HandlerFunc(tourRPCHandler))

	mux.Handle("/api/blogs/", protectedHandler)
	mux.Handle("/api/stakeholders/", protectedHandler)
	mux.Handle("/api/followers/", protectedHandler)
	mux.Handle("/api/sagas/tours/", protectedSagaHandler)
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
