#!/usr/bin/env bash
# Hourly SQLite backup with 48h retention
set -euo pipefail

DB="/Users/dieuson/Projects/ai-trading/ProjectManager/data/app.db"
BACKUP_DIR="/Users/dieuson/Projects/ai-trading/ProjectManager/data/backups"
KEEP_HOURS=48

mkdir -p "$BACKUP_DIR"

STAMP=$(date +"%Y%m%d_%H%M%S")
DEST="$BACKUP_DIR/app_${STAMP}.db"

# Online backup — safe while app is running
sqlite3 "$DB" ".backup '$DEST'"

echo "[$(date)] Backup → $DEST ($(du -sh "$DEST" | cut -f1))"

# Prune backups older than KEEP_HOURS
find "$BACKUP_DIR" -name "app_*.db" -mmin +$((KEEP_HOURS * 60)) -delete
echo "[$(date)] Pruned backups older than ${KEEP_HOURS}h"
