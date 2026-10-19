// Staging one-shot worker; no mailbox, notifications, real bank parser or ledger posting.
package main

import (
	"github.com/user/superapp/backend/internal/finance"
	"github.com/user/superapp/backend/pkg/database"
	"log"
)

func main() {
	db := database.NewPostgresConn()
	for i := 0; i < 1000; i++ {
		ok, err := finance.QueueForManualReview(db)
		if err != nil {
			log.Fatal("finance review queue failed")
		}
		if !ok {
			return
		}
	}
}
