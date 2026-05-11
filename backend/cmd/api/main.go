package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/user/superapp/backend/internal/delivery/http"
	"github.com/user/superapp/backend/internal/middleware"
	"github.com/user/superapp/backend/internal/repository"
	"github.com/user/superapp/backend/internal/usecase"
	"github.com/user/superapp/backend/pkg/database"
)

func main() {
	// 1. Database Connection
	db := database.NewPostgresConn()

	// 2. Repository Layer
	ctxRepo := repository.NewContextRepository(db)
	userRepo := repository.NewUserRepository(db)
	socialRepo := repository.NewSocialRepository(db)

	// 2a. Auto Migrate Models
	log.Println("[Database] Running AutoMigrate...")
	db.AutoMigrate(&domain.User{}, &domain.UserContext{}, &domain.LeaderboardEntry{}, &domain.Squad{})

	// 2a. AI Service
	aiService := usecase.NewAIService()

	// 2b. Agentic Observer (Event-Driven Listener)
	agenticObs := usecase.NewAgenticObserver(aiService, socialRepo, userRepo)

	// 3. Usecase Layer
	ctxUsecase := usecase.NewContextUsecase(ctxRepo, agenticObs)
	userUsecase := usecase.NewUserUsecase(userRepo)
	socialUsecase := usecase.NewSocialUsecase(socialRepo)

	// 4. Fiber App Initialization
	app := fiber.New(fiber.Config{
		AppName: "SelfOne SuperApp API v1",
	})

	// 5. Global Middleware
	app.Use(logger.New())

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
