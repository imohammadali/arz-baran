package logger

import (
	"log/slog"
	"os"

	"backend/internal/platform/config"
)

func New(cfg config.Config) *slog.Logger {
	level := slog.LevelInfo
	if cfg.IsDevelopment() {
		level = slog.LevelDebug
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: level,
	})

	return slog.New(handler).With(
		"service", cfg.AppName,
		"env", cfg.AppEnv,
	)
}
