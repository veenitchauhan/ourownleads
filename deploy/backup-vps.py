#!/usr/bin/env python3
"""Root-only SQLite snapshot and matching credential configuration backup."""
import datetime
import os
from pathlib import Path
import shutil
import sqlite3

os.umask(0o077)
base = Path('/opt/our-own-leads')
destination = base / 'backups' / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
destination.mkdir(parents=True, exist_ok=False)
with sqlite3.connect('file:' + str(base / 'shared/data/our-own-leads.sqlite') + '?mode=ro', uri=True) as source:
    with sqlite3.connect(destination / 'database.sqlite') as target:
        source.backup(target)
shutil.copyfile(base / 'shared/production.env', destination / 'production.env')
print('Created private backup:', destination.name)
