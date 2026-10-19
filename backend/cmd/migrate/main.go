package main

import (
	"github.com/user/superapp/backend/migrations"
	"github.com/user/superapp/backend/pkg/database"
	"log"
)

func main() {
	if err := migrations.Apply(database.NewPostgresConn()); err != nil {
		log.Fatal(err)
	}
	log.Println("Database migrations complete")
}
