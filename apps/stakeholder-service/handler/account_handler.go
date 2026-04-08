package handler

import (
	"encoding/json"
	"net/http"
	"stakeholder_service/model"
	"strconv"

	"github.com/gorilla/mux"
)

type AccountHandler struct {
	service model.AccountService
}

func NewAccountHandler(service model.AccountService) *AccountHandler {
	return &AccountHandler{service: service}
}

func (h *AccountHandler) BlockAccount(w http.ResponseWriter, r *http.Request) {
	role := r.Header.Get("X-User-Role")
	if role == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "missing role header",
		})
		return
	}

	if role != string(model.RoleAdmin) {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "forbidden - admin only",
		})
		return
	}

	vars := mux.Vars(r)
	idStr := vars["id"]
	u, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "invalid account id",
		})
		return
	}
	id := uint(u)

	err = h.service.BlockAccount(r.Context(), id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": err.Error(),
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "account successfuly blocked",
	})
}
