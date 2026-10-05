package config

import (
	"fmt"
	"os"
	"time"
)

type Config struct {
	// Server
	Port    string
	Mode    string // signaling, sfu, hybrid
	
	// Database
	DatabaseURL      string
	MaxDBConns       int
	DBConnMaxLifetime time.Duration
	
	// JWT
	JWTSecret         string
	JWTExpiration     time.Duration
	RefreshExpiration time.Duration
	
	// CORS
	AllowedOrigins []string
}

func Load() *Config {
	return &Config{
		Port:              getEnv("PORT", "8080"),
		Mode:              getEnv("MODE", "hybrid"),
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://voicehub:voicehub@localhost:5432/voicehub?sslmode=disable"),
		MaxDBConns:        getEnvInt("MAX_DB_CONNS", 25),
		DBConnMaxLifetime: time.Duration(getEnvInt("DB_CONN_MAX_LIFETIME", 5)) * time.Minute,
		JWTSecret:         getEnv("JWT_SECRET", "change-this-secret-in-production-min-32-chars!!"),
		JWTExpiration:     time.Duration(getEnvInt("JWT_EXPIRATION_HOURS", 24)) * time.Hour,
		RefreshExpiration: time.Duration(getEnvInt("REFRESH_EXPIRATION_DAYS", 7)) * 24 * time.Hour,
		AllowedOrigins:    []string{"*"},
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value, exists := os.LookupEnv(key); exists {
		var result int
		if _, err := fmt.Sscanf(value, "%d", &result); err == nil {
			return result
		}
	}
	return defaultValue
}
