package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

type AuthClient struct {
	baseURL    string
	httpClient *http.Client
}

type IssueTokenRequest struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

type IssueTokenResponse struct {
	Token string `json:"token"`
}

type ValidateTokenRequest struct {
	Token string `json:"token"`
}

type ValidateTokenResponse struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

func NewAuthClientFromEnv() *AuthClient {
	baseURL := os.Getenv("AUTH_SERVICE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8081"
	}
	return &AuthClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (c *AuthClient) IssueToken(ctx context.Context, req IssueTokenRequest) (string, error) {
	var resp IssueTokenResponse
	err := c.postJSON(ctx, "/token/issue", req, &resp)
	if err != nil {
		return "", err
	}
	if resp.Token == "" {
		return "", fmt.Errorf("auth service returned empty token")
	}
	return resp.Token, nil
}

func (c *AuthClient) ValidateToken(ctx context.Context, token string) (*ValidateTokenResponse, error) {
	var resp ValidateTokenResponse
	err := c.postJSON(ctx, "/token/validate", ValidateTokenRequest{Token: token}, &resp)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *AuthClient) postJSON(ctx context.Context, path string, requestBody interface{}, responseBody interface{}) error {
	payload, err := json.Marshal(requestBody)
	if err != nil {
		return fmt.Errorf("marshal auth request: %w", err)
	}

	url := c.baseURL + path
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("create auth request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("call auth service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errResp map[string]string
		if decodeErr := json.NewDecoder(resp.Body).Decode(&errResp); decodeErr == nil {
			if msg, ok := errResp["error"]; ok && msg != "" {
				return fmt.Errorf("auth service error: %s", msg)
			}
		}
		return fmt.Errorf("auth service returned status %d", resp.StatusCode)
	}

	if err := json.NewDecoder(resp.Body).Decode(responseBody); err != nil {
		return fmt.Errorf("decode auth response: %w", err)
	}

	return nil
}
