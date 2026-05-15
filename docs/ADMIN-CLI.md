# Admin CLI

The `admin-cli` is a local command-line tool for managing `floorplan-app` deployment configuration, environment variables, DNS, and platform administration.

## Installation

Dependencies are already in the workspace:

```bash
npm install  # installs commander, @inquirer/prompts, chalk
```

## Quick Start

```bash
# See all available commands
npx tsx scripts/admin-cli.ts --help

# Or via mise
mise run admin-cli ADMIN_ARGS="--help"
```

## Development vs Production

The CLI has two main setup commands:

| Command | Environment | Purpose |
|---------|-------------|---------|
| `config setup-dev` | Local / Docker | Configure `.env.development` for self-hosted Convex, mock auth |
| `config setup-all` | Production | Configure domain across Vercel, Convex cloud, Google OAuth, DNS |

## Commands

### `config setup-dev` — Local Development Setup

Configure `.env.development` for Docker/local development with self-hosted Convex:

```bash
# Preview changes
npx tsx scripts/admin-cli.ts config setup-dev --dry-run

# Apply with defaults (localhost:3000, mock auth enabled)
npx tsx scripts/admin-cli.ts config setup-dev --yes

# Custom local domain and Convex URLs
npx tsx scripts/admin-cli.ts config setup-dev --yes \
  --domain http://localhost:3000 \
  --convex-url http://localhost:3210 \
  --convex-site http://localhost:3211 \
  --mock-auth
```

**What it does:**
1. Updates `.env.development` with local URLs
2. Configures self-hosted Convex URLs
3. Enables mock auth bypass (optional)
4. Prints next steps (docker:up, langium:generate, app-dev)

### `config` — Configuration Management

```bash
# Set production domain (updates .env.production)
npx tsx scripts/admin-cli.ts config set-domain floorplan.example.com --yes

# Set super admin email
npx tsx scripts/admin-cli.ts config set-super-admin admin@example.com --yes

# Set Google OAuth credentials
npx tsx scripts/admin-cli.ts config set-google-oauth \
  <client-id>.apps.googleusercontent.com \
  GOCSPX-<secret> --yes

# Set Convex cloud URLs
npx tsx scripts/admin-cli.ts config set-convex \
  https://happy-animal-123.convex.cloud \
  https://happy-animal-123.convex.site --yes

# Generate a random auth secret
npx tsx scripts/admin-cli.ts config set-auth-secret --yes

# Show current configuration
mise run admin-config

# Validate configuration consistency
npx tsx scripts/admin-cli.ts config validate
```

### `config setup-all` — Full Domain Setup

One command to configure the domain across **all** services:

```bash
# Preview changes without applying
npx tsx scripts/admin-cli.ts config setup-all floorplan.example.com --dry-run

# Apply everything
npx tsx scripts/admin-cli.ts config setup-all floorplan.example.com --yes

# Skip specific services
npx tsx scripts/admin-cli.ts config setup-all floorplan.example.com --yes \
  --skip-vercel --skip-dns
```

**What it does:**
1. Updates `.env.production` (`BETTER_AUTH_URL`, `SITE_URL`)
2. Syncs env vars to Convex (`SITE_URL`, `ALLOWED_ORIGINS`)
3. Adds domain to Vercel project + sets production env vars
4. Updates Google OAuth authorized origins/redirect URIs
5. Creates DNS CNAME record (Cloudflare) or prints manual instructions

**Prerequisites for full automation:**

```bash
# 1. Vercel API token (from https://vercel.com/account/tokens)
npx tsx scripts/admin-cli.ts config set-vercel-token <token>
npx tsx scripts/admin-cli.ts config set-vercel-project-id <project-id>

# 2. Google Cloud service account (optional — falls back to instructions)
npx tsx scripts/admin-cli.ts config set-google-credentials /path/to/key.json

# 3. Cloudflare DNS credentials (optional — falls back to instructions)
npx tsx scripts/admin-cli.ts config set-dns-credentials cloudflare <token> <zone-id>
```

### `env` — Environment File Management

```bash
# Ensure .env.production has all required keys
npx tsx scripts/admin-cli.ts env update-production --yes

# Update .env.development for local domain testing
npx tsx scripts/admin-cli.ts env update-local --domain http://localhost:3000 --yes

# Sync all env vars to Convex cloud
npx tsx scripts/admin-cli.ts env sync-to-convex --yes

# Sync specific vars only
npx tsx scripts/admin-cli.ts env sync-to-convex --vars SITE_URL,BETTER_AUTH_SECRET --yes
```

### `dns` — DNS Setup Wizard

```bash
# Interactive DNS setup wizard
npx tsx scripts/admin-cli.ts dns setup floorplan.example.com

# Verify DNS propagation
npx tsx scripts/admin-cli.ts dns verify floorplan.example.com
```

### `deploy` — Deployment Verification

```bash
# Pre-deploy checklist (validates all required env vars)
mise run admin-deploy-check

# Post-deploy verification
npx tsx scripts/admin-cli.ts deploy verify
```

### `admin` — Platform Administration

```bash
# List all users
npx tsx scripts/admin-cli.ts admin list-users

# Promote user to admin
npx tsx scripts/admin-cli.ts admin promote <user-id>

# Show platform stats
npx tsx scripts/admin-cli.ts admin stats

# Feature a project
npx tsx scripts/admin-cli.ts admin feature <project-id>
```

## Credential Storage

Sensitive API tokens are stored in the **OS keyring** (macOS Keychain, Linux Secret Service, Windows Credential Manager) via `@napi-rs/keyring`. Non-sensitive metadata remains in `.admin-cli.json`:

```json
{
  "vercelProjectId": "...",
  "dnsProvider": "cloudflare",
  "dnsZoneId": "..."
}
```

**Security note:** Never commit `.admin-cli.json` if it contains sensitive values. The CLI automatically removes migrated tokens from the file.

### Keyring Mapping

| Credential | Service | Account |
|---|---|---|
| `vercelToken` | `floorplan-app/admin-cli` | `vercelToken` |
| `dnsToken` | `floorplan-app/admin-cli` | `dnsToken` |
| `googleServiceAccountPath` | `floorplan-app/admin-cli` | `googleServiceAccountPath` |

### Fallback Behavior

If the OS keyring is unavailable (e.g., headless Linux without a secret service), the CLI falls back to storing sensitive credentials in `.admin-cli.json` with a warning.

### Credential Commands

```bash
# Migrate existing plain-text credentials to OS keyring
npx tsx scripts/admin-cli.ts config migrate-credentials

# Clear all stored credentials from keyring and file
npx tsx scripts/admin-cli.ts config clear-credentials --yes
```

## mise Tasks

| Task | Command |
|------|---------|
| `mise run admin-cli` | Run admin CLI with args |
| `mise run admin-config` | Show current configuration |
| `mise run admin-setup-domain` | Interactive domain setup |
| `mise run admin-sync-env` | Sync env vars to Convex |
| `mise run admin-deploy-check` | Pre-deploy checklist |

## Troubleshooting

**"Could not detect Vercel project ID"**
→ Run `npx tsx scripts/admin-cli.ts config set-vercel-project-id <id>`

**"Google Cloud API automation not available"**
→ The CLI prints manual instructions. To automate, provide a service account key with `config set-google-credentials`.

**"DNS provider not configured"**
→ Run `config set-dns-credentials` or follow the printed manual instructions.

**"OS keyring is not available on this system"**
→ On Linux, install `libsecret` and a D-Bus secret service provider:
```bash
# Debian/Ubuntu
sudo apt install libsecret-1-0 gnome-keyring

# Or use a compatible alternative like kwallet
```
→ The CLI will fall back to `.admin-cli.json` file storage with a warning.

**Keyring fallback warning**
→ If you see a fallback warning, credentials are still saved but in `.admin-cli.json`. Run `config migrate-credentials` after setting up the keyring to move them securely.
