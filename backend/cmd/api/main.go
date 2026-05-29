package main

import (
	"bufio"
	"log"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/user/superapp/backend/internal/delivery/http"
	"github.com/user/superapp/backend/internal/domain"
	"github.com/user/superapp/backend/internal/middleware"
	"github.com/user/superapp/backend/internal/repository"
	"github.com/user/superapp/backend/internal/usecase"
	"github.com/user/superapp/backend/pkg/database"
)

func loadEnv(filepath string) {
	file, err := os.Open(filepath)
	if err != nil {
		log.Printf("[Env Warning] Could not open %s: %v", filepath, err)
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			if os.Getenv(key) == "" {
				os.Setenv(key, val)
			}
		}
	}
	log.Println("[Env] Loaded environment variables from", filepath)
}

func main() {
	// Load .env variables before any other service starts
	loadEnv(".env")

	// 1. Database Connection
	db := database.NewPostgresConn()

	// 2. Repository Layer
	ctxRepo := repository.NewContextRepository(db)
	userRepo := repository.NewUserRepository(db)
	socialRepo := repository.NewSocialRepository(db)
	insightRepo := repository.NewInsightRepository(db)
	coachRepo := repository.NewCoachRepository(db)

	// 2a. Auto Migrate Models & Extensions
	log.Println("[Database] Initializing extensions and running AutoMigrate...")
	db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
	
	// Migrate one by one to avoid one table blocking others
	models := []interface{}{
		&domain.User{},
		&domain.UserContext{},
		&domain.LeaderboardEntry{},
		&domain.Squad{},
		&domain.Insight{},
		&domain.CoachMessage{},
		&domain.Challenge{},
		&domain.ChallengeProgress{},
	}

	for _, model := range models {
		if err := db.AutoMigrate(model); err != nil {
			log.Printf("[Database Warning] Migration for a model failed (non-fatal): %v", err)
		}
	}

	// 2a. AI Service
	aiService := usecase.NewAIService()

	// 2b. Agentic Observer (Event-Driven Listener)
	agenticObs := usecase.NewAgenticObserver(aiService, socialRepo, userRepo)

	// 3. Usecase Layer
	ctxUsecase := usecase.NewContextUsecase(ctxRepo, agenticObs)
	userUsecase := usecase.NewUserUsecase(userRepo)
	socialUsecase := usecase.NewSocialUsecase(socialRepo)
	correlationEngine := usecase.NewCorrelationEngine(aiService, ctxRepo, insightRepo)
	coachEngine := usecase.NewCoachEngine(aiService, ctxRepo, coachRepo)

	// 4. Fiber App Initialization
	app := fiber.New(fiber.Config{
		AppName: "SelfOne SuperApp API v1",
	})

	// 5. Global Middleware
	app.Use(logger.New())
	app.Use(cors.New())

	// 6. Auth Middleware
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "super-secret-key"
	}
	// Middleware di-skip untuk endpoint tertentu jika perlu, 
	// tapi untuk demo ini kita biarkan di semua route /api/v1
	app.Use(middleware.JWTMiddleware(jwtSecret))

	// 7. Delivery/Routes Layer
	http.NewContextHandler(app, ctxUsecase)
	http.NewUserHandler(app, userUsecase)
	http.NewSocialHandler(app, socialUsecase)
	http.NewParseHandler(app, aiService)
	http.NewInsightHandler(app, correlationEngine, insightRepo)
	http.NewCoachHandler(app, coachEngine, coachRepo)

	// 8. Health Check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	// 9. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Fatal(app.Listen(":" + port))
}
