package usecase

import (
	"fmt"
	"log"
	"github.com/user/superapp/backend/internal/domain"
)

type AgenticObserver struct {
	// Channel untuk menerima context baru
	ContextChan chan domain.UserContext
	aiService   *AIService
}

func NewAgenticObserver(ai *AIService) *AgenticObserver {
	o := &AgenticObserver{
		ContextChan: make(chan domain.UserContext, 100),
		aiService:   ai,
	}
	// Jalankan listener di goroutine permanen
	go o.Listen()
	return o
}

func (o *AgenticObserver) Listen() {
	log.Println("[Agentic Listener] Observer is active and waiting for events...")
	
	for ctx := range o.ContextChan {
		// Filter: Hanya proses FINANCE atau HEALTH
		if ctx.ModuleType == "FINANCE" || ctx.ModuleType == "HEALTH" {
			o.ProcessWithAI(ctx)
		}
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
