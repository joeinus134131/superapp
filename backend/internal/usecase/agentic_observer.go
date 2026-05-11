package usecase

import (
	"encoding/json"
	"fmt"
	"log"
	"time"
	"github.com/user/superapp/backend/internal/domain"
)

type AgenticObserver struct {
	// Channel untuk menerima context baru
	ContextChan chan domain.UserContext
	aiService   *AIService
	socialRepo  domain.SocialRepository
	userRepo    domain.UserRepository
}

func NewAgenticObserver(ai *AIService, social domain.SocialRepository, user domain.UserRepository) *AgenticObserver {
	o := &AgenticObserver{
		ContextChan: make(chan domain.UserContext, 100),
		aiService:   ai,
		socialRepo:  social,
		userRepo:    user,
	}
	// Jalankan listener di goroutine permanen
	go o.Listen()
	return o
}

func (o *AgenticObserver) Listen() {
	log.Println("[Agentic Listener] Observer is active and waiting for events...")
	
	for ctx := range o.ContextChan {
		// 1. Proses AI Insight (FINANCE/HEALTH)
		if ctx.ModuleType == "FINANCE" || ctx.ModuleType == "HEALTH" {
			o.ProcessWithAI(ctx)
		}

		// 2. Update Leaderboard (GAMIFICATION)
		if ctx.ModuleType == "GAMIFICATION" {
			o.UpdateLeaderboard(ctx)
		}
	}
}

func (o *AgenticObserver) UpdateLeaderboard(ctx domain.UserContext) {
	log.Printf("[Agentic Social] Updating leaderboard for user %s...", ctx.UserID)

	// 1. Ambil data User buat dapet Namanya
	user, err := o.userRepo.GetByID(ctx.UserID)
	if err != nil {
		log.Printf("[Agentic Social Error] User not found: %v", err)
		return
	}

	// 2. Parse Payload XP
	var gamData struct {
		TotalXP int `json:"totalXP"`
	}
	if err := json.Unmarshal(ctx.DataPayload, &gamData); err != nil {
		log.Printf("[Agentic Social Error] Invalid payload: %v", err)
		return
	}

	// 3. Hitung Level (Rumus: sama dengan mobile lib/gamification.ts)
	level := 1
	xpTable := []int{0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500}
	for i, minXP := range xpTable {
		if gamData.TotalXP >= minXP {
			level = i + 1
		} else {
			break
		}
	}

	// 4. Update ke Leaderboard Entry
	entry := domain.LeaderboardEntry{
		UserID:   ctx.UserID,
		Name:     user.Name,
		Level:    level,
		TotalXP:  gamData.TotalXP,
		LastSeen: time.Now(),
	}

	if err := o.socialRepo.UpdateUserStats(entry); err != nil {
		log.Printf("[Agentic Social Error] Save leaderboard failed: %v", err)
	} else {
		log.Printf("[Agentic Social Success] Leaderboard updated for %s (Lv.%d, %d XP)", user.Name, level, gamData.TotalXP)
	}
}

func (o *AgenticObserver) ProcessWithAI(ctx domain.UserContext) {
	log.Printf("[Agentic AI] Analysing module %s for user %s...", ctx.ModuleType, ctx.UserID)
	
	prompt := fmt.Sprintf("Berikut adalah data terbaru dari modul %s pengguna: %s. Berikan analisis singkat dan saran aksi.", ctx.ModuleType, string(ctx.DataPayload))
	
	go func() {
		var result string
		var err error

		if ctx.ModuleType == "FINANCE" {
			// Gunakan Groq untuk kecepatan analisis angka
			result, err = o.aiService.CallGroq(prompt)
		} else if ctx.ModuleType == "HEALTH" {
			// Gunakan Claude untuk analisis kesehatan yang lebih emosional/bijak
			result, err = o.aiService.CallClaude(prompt)
		}

		if err != nil {
			log.Printf("[Agentic AI Error] %v", err)
			return
		}

		log.Printf("[Agentic AI Insight] Module %s: %s", ctx.ModuleType, result)
		// Di sini Anda bisa menyimpan result ini ke tabel 'insights' di database
	}()
}
