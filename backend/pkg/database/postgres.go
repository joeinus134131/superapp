package database

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func NewPostgresConn() *gorm.DB {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required; copy backend/.env.example to backend/.env")
	}

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // Disable implicit prepared statement usage
	}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to configure database pool: ", err)
	}
	sqlDB.SetMaxOpenConns(envInt("DB_MAX_OPEN_CONNS", 25))
	sqlDB.SetMaxIdleConns(envInt("DB_MAX_IDLE_CONNS", 5))
	sqlDB.SetConnMaxLifetime(time.Duration(envInt("DB_CONN_MAX_LIFETIME_MINUTES", 30)) * time.Minute)
	if err := sqlDB.Ping(); err != nil {
		log.Fatal("Failed to ping database: ", err)
	}

	fmt.Println("Database connection established")
	return db
}

func envInt(key string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(key))
	if err != nil || value < 1 {
		return fallback
	}
	return value
}
