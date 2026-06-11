package main

import (
	"context"
	"log"
	"os"

	"github.com/imohammadali/arz-baran/backend/cmd/api/app"
)

func main() {
	ctx := context.Background()

	application, err := app.New(ctx)
	if err != nil {
		log.Printf("fatal: %v", err)
		os.Exit(1)
	}

	if err := application.Run(ctx); err != nil {
		log.Printf("fatal: %v", err)
		os.Exit(1)
	}
}
