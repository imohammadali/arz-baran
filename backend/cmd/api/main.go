// Package main is the entry point for the exchange API binary.
//
//	@title			Arz Baran Exchange API
//	@version		0.1.0
//	@description	Production-grade crypto and online gold exchange backend.
//
//	@contact.name	Arz Baran Engineering
//
//	@license.name	Proprietary
//
//	@host		localhost:8080
//	@BasePath	/
//	@schemes	http https
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
