# Backup & Reset Notes

## Production

Production database backups rely on Neon Postgres point-in-time recovery (PITR).

- Check the retention window in the Neon dashboard at `console.neon.tech`.
- Open your project, then go to **Project settings > Backup/Restore** to verify PITR retention and restore options.

## Automated Backup on Reset (`pnpm db:reset`)

When executing `node --experimental-strip-types scripts/reset-db.mjs` or `pnpm db:reset`, the script automatically exports a full snapshot of all existing tables into the `/backups` directory (e.g. `backups/aksora_backup_neon_<timestamp>.json`) before wiping the schema.

## Local Development (Docker)

`scripts/backup.mjs` (`pnpm db:backup`) is for dev environments running a local Docker container named `aksora-db`.

- Dumps SQL via `docker exec aksora-db pg_dump`.
- Saved into the `backups/` directory (gitignored).

## Restore

- For Neon production: Use Neon's PITR or branch restore flow in the dashboard.
- For local Docker: Restore from `backups/*.sql` using `docker exec -i aksora-db psql -U admin aksora < backups/<file>.sql`.
