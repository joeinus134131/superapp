package usecase

import (
	"log"
	"github.com/google/uuid"
	"github.com/user/superapp/backend/internal/domain"
)

type contextUsecase struct {
	repo     domain.ContextRepository
	observer *AgenticObserver
}

func NewContextUsecase(repo domain.ContextRepository, observer *AgenticObserver) domain.ContextUsecase {
	return &contextUsecase{repo, observer}
}

func (u *contextUsecase) SyncContexts(userID uuid.UUID, contexts []domain.UserContext) error {
	// Menyiapkan data
	for i := range contexts {
		contexts[i].UserID = userID
		if contexts[i].ID == uuid.Nil {
			contexts[i].ID = uuid.New()
		}
	}

	// EKSEKUSI GOROUTINE:
	// Kita simpan ke DB secara background agar mobile tidak menunggu IO DB yang lama.
	// Note: Dalam production nyata, sebaiknya gunakan Queue (Redis/RabbitMQ) jika volume sangat besar.
	go func(data []domain.UserContext) {
		if err := u.repo.SaveBatch(data); err != nil {
			log.Printf("[Sync Goroutine Error] User %s: %v", userID, err)
		} else {
			log.Printf("[Sync Success] Persisted %d items for user %s", len(data), userID)
			// Kirim ke Agentic Observer untuk diproses AI
			for _, ctx := range data {
				u.observer.ContextChan <- ctx
			}
		}
	}(contexts)

	return nil
}
