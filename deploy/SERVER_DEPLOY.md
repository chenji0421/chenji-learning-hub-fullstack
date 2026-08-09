# chenji.felixfu.xyz server deployment

This folder contains the Docker Compose setup for deploying Chenji Learning Hub on Felix Fu's server.

## DNS

Create an A record:

```text
chenji.felixfu.xyz -> 47.242.176.227
```

## GitHub OAuth

Create a GitHub OAuth App with:

```text
Homepage URL:
https://chenji.felixfu.xyz

Authorization callback URL:
https://chenji.felixfu.xyz/api/auth/github/callback
```

## Server files

Clone the repository on the server, for example:

```bash
sudo mkdir -p /opt/chenji-learning-hub
sudo chown "$USER":"$USER" /opt/chenji-learning-hub
git clone https://github.com/chenji0421/chenji-learning-hub-fullstack.git /opt/chenji-learning-hub
cd /opt/chenji-learning-hub
cp .env.server.example .env
```

Fill `.env` with the real GitHub OAuth values and a strong `AUTH_SECRET`.

Generate a secret with:

```bash
openssl rand -hex 32
```

## Start the app

```bash
docker compose -f docker-compose.server.yml up -d --build
```

The frontend container listens on:

```text
127.0.0.1:18080
```

The backend is only reachable inside the Compose network. Requests to `/api` are proxied by the frontend Nginx container.

## Host Nginx

Use `deploy/nginx-host-example.conf` as the host-level Nginx site, then add HTTPS with Certbot or the server's existing certificate workflow.

## Update

```bash
cd /opt/chenji-learning-hub
git pull --ff-only
docker compose -f docker-compose.server.yml up -d --build
```

## Backup

The default SQLite database is stored in the Docker volume `chenji-learning-hub-fullstack_chenji_data`.
Back up this volume regularly before upgrading or deleting containers.
