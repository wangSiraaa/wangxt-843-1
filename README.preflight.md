# Trae Preflight

This folder is prepared for `wangxt-843-1`.

Use `.env` for stable local ports and compose project identity:

- APP_PORT: 18143
- API_PORT: 19143
- WEB_PORT: 20143
- DB_PORT: 21143
- REDIS_PORT: 22143

Smoke entry:

```bash
bash scripts/smoke.sh
```

The preflight files are environment scaffolding only. The generated business
project can replace or extend them when needed.
