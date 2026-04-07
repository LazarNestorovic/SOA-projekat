package handler

import (
	"encoding/json"
	"net/http"
	"stakeholder_service/model"
	"strconv"

	"github.com/gorilla/mux"
)

type ProfileHandler struct {
	service model.ProfileService
}

func NewProfileHandler(service model.ProfileService) *ProfileHandler {
	return &ProfileHandler{service: service}
}

func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	u, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "invalid profile id",
		})
		return
	}
	id := uint(u)

	err = h.service.GetProfile(r.Context(), id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": err.Error(),
		})
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "profile found",
	})
}
