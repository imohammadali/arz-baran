# API Documentation (Swagger / OpenAPI)

## Swagger UI

Available in `development` and `staging` environments at:

```
http://localhost:8080/swagger/index.html
```

> The `/swagger/*` route is **not registered** when `APP_ENV=production`.

## Regenerate docs

After adding or changing `// @...` swag annotations:

```bash
make swagger-generate
```

Or run directly:

```bash
swag init -g ./cmd/api/main.go -o ./docs --parseInternal
```

## Annotations location

| What                      | File                                                       |
|---------------------------|------------------------------------------------------------|
| API title / version / host | `cmd/api/main.go`                                         |
| Health endpoints           | `internal/platform/httpx/server.go`                       |
| IAM routes                 | `internal/module/iam/handler/handler.go`                  |
| Instrument routes          | `internal/module/instrument/handler/handler.go`           |
| Wallet routes              | `internal/module/wallet/handler/handler.go`               |
| Trading routes             | `internal/module/trading/handler/handler.go`              |
| Admin routes               | `internal/admin/handler/handler.go`                       |

## Generated files

`swag init` writes three files into `docs/`:

- `docs.go` — Go package that registers the spec via `init()` (commit this)
- `swagger.json` — OpenAPI 2.0 spec (commit or gitignore, your choice)
- `swagger.yaml` — same spec in YAML (commit or gitignore, your choice)
