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
	"github.com/user/superapp/backend/internal/finance"
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
	userDataRepo := repository.NewUserDataRepository(db)

	if os.Getenv("SKIP_AUTO_MIGRATION") == "true" {
		log.Println("[Database] AutoMigrate disabled; explicit migrations required")
	} else {
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
			&domain.UserData{},
			&domain.DataMigration{},
			&domain.Challenge{},
			&domain.ChallengeProgress{},
		}

		for _, model := range models {
			if err := db.AutoMigrate(model); err != nil {
				log.Printf("[Database Warning] Migration for a model failed (non-fatal): %v", err)
			}
		}

	}

	// 2a. AI Service
	aiService := usecase.NewAIService()

	// 2b. Agentic Observer (Event-Driven Listener)
	agenticObs := usecase.NewAgenticObserver(aiService, socialRepo, userRepo, insightRepo)

	// 3. Usecase Layer
	ctxUsecase := usecase.NewContextUsecase(ctxRepo, agenticObs)
	userUsecase := usecase.NewUserUsecase(userRepo)
	socialUsecase := usecase.NewSocialUsecase(socialRepo)
	correlationEngine := usecase.NewCorrelationEngine(aiService, ctxRepo, insightRepo)
	coachEngine := usecase.NewCoachEngine(aiService, ctxRepo, coachRepo)

	// 4. Fiber App Initialization
	app := fiber.New(fiber.Config{
		AppName:   "SelfOne SuperApp API v1",
		BodyLimit: 12 * 1024 * 1024,
	})

	// 5. Global Middleware
	app.Use(logger.New())
	allowedOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:3000,http://localhost:3001,http://localhost:8081,https://selfone.app"
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,Idempotency-Key,X-Request-ID,X-Document-SHA256",
		AllowCredentials: true,
	}))

	// 6. Health Check (public — no auth required)
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	// 7. Auth Middleware for protected routes
	jwtSecret := middleware.GetJWTSecret()
	jwksURL := middleware.GetSupabaseJWKSURL()
	issuer := middleware.GetSupabaseJWTIssuer()
	audience := middleware.GetSupabaseJWTAudience()
	if jwtSecret == "" && jwksURL == "" {
		log.Fatal("[Fatal] Configure JWT_SECRET or SUPABASE_JWKS_URL. Refusing to start without authentication.")
	}

	// Finance integration authenticates separate opaque connection tokens.
	finance.RegisterIntegration(app, finance.PostgresStore{DB: db})

	// Create a route group that requires JWT auth and guarantees a users row.
	api := app.Group("/api/v1",
		middleware.JWTMiddleware(jwtSecret, jwksURL, issuer, audience),
		middleware.ProvisionUser(userUsecase),
	)

	// 8. Delivery/Routes Layer (registered under the protected group)
	http.NewContextHandler(api, ctxUsecase)
	http.NewUserHandler(api, userUsecase)
	http.NewSocialHandler(api, socialUsecase)
	http.NewParseHandler(api, aiService)
	http.NewAIHandler(api, aiService)
	http.NewInsightHandler(api, correlationEngine, insightRepo)
	http.NewCoachHandler(api, coachEngine, coachRepo)
	http.NewStorageHandler(api, userDataRepo)
	finance.RegisterCore(api, db)
	vault, err := finance.VaultFromEnv()
	if err != nil {
		log.Fatal("[Fatal] Invalid private vault configuration")
	}
	finance.RegisterVault(api, db, vault)
	if err := finance.RegisterResearch(api, db, finance.ResearchConfigFromEnv()); err != nil {
		log.Fatal("[Fatal] Invalid FinLab configuration")
	}

	// 9. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Fatal(app.Listen(":" + port))
}
