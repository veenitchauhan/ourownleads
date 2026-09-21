# VPS deployment

Production domain: `https://ourownleads.com`. Source: `veenitchauhan/ourownleads`, branch `main`.

The VPS checkout is `/opt/our-own-leads/source`. Docker runs Node 24 and the Next.js standalone server as a non-root user, exposed only at `127.0.0.1:3100`. Nginx provides public HTTPS. Other server applications use their existing configurations.

Persistent data is at `/opt/our-own-leads/shared/data`; credentials are in root-readable `/opt/our-own-leads/shared/production.env`. Neither belongs in Git or the Docker build context. The credential encryption key must always travel with database backups. Initial migration excludes login sessions. Production disables local testing access.

After pushing an update to GitHub main, run on the VPS:

```bash
bash /opt/our-own-leads/source/deploy/update-vps.sh
```

The script refuses dirty checkouts, pulls fast-forward only, builds before restarting the app, and waits for its health check. A Git push alone does not trigger deployment.

Create a consistent backup:

```bash
python3 /opt/our-own-leads/source/deploy/backup-vps.py
```

Backups include private credential configuration: keep them root-only and use an encrypted off-server destination for disaster recovery. This script does not delete older backups. Restore only with the app stopped, preserving ownership `1000:1000` on the data directory and installing the matching credential configuration.

Inspect runtime health without printing secrets:

```bash
cd /opt/our-own-leads/deploy
docker compose ps
curl -I http://127.0.0.1:3100/
```

Meta must use the stable domain in app domains, policy links, JavaScript SDK domains, and webhook callback `https://ourownleads.com/api/webhooks/whatsapp`. Hosting does not imply Meta access approval or completion of automatic AI replies.
