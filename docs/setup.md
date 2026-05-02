# VPS Setup Guide

ConoHa VPS (1GB RAM, Ubuntu 24.04) でのセットアップ手順。

## 1. Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node --version  # v22.x
```

## 2. pnpm

```bash
npm install -g pnpm
```

## 3. OWS (Open Wallet Standard)

```bash
curl -fsSL https://docs.openwallet.sh/install.sh | bash
source ~/.bashrc
ows wallet create --name jpyc-agent
```

## 4. OpenClaw

```bash
cd ~
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
```

## 5. Skills

```bash
git clone https://github.com/Mameta29/jpyc-ec-agent.git /tmp/jpyc-ec-agent
mkdir -p ~/.agents/skills
cp -r /tmp/jpyc-ec-agent/skills/* ~/.agents/skills/
```

## 6. Configuration

```bash
cd ~/openclaw

# Telegram Bot
pnpm openclaw config set channels.telegram.botToken "YOUR_BOT_TOKEN"
pnpm openclaw config set channels.telegram.enabled true
pnpm openclaw config set channels.telegram.allowFrom '["*"]'
pnpm openclaw config set channels.telegram.dmPolicy open

# Model
pnpm openclaw config set agents.list.0.model anthropic/claude-sonnet-4-6

# Performance optimization
pnpm openclaw config set plugins.allow '["anthropic","telegram"]'
pnpm openclaw config set agents.defaults.thinkingDefault off
pnpm openclaw config set agents.list.0.thinkingDefault off
```

## 7. Auth (Anthropic API Key)

```bash
# Create auth profile
cat > ~/.openclaw/agents/main/agent/auth-profiles.json << 'EOF'
{
  "version": 1,
  "profiles": {
    "anthropic:default": {
      "type": "api_key",
      "provider": "anthropic",
      "key": "YOUR_ANTHROPIC_API_KEY"
    }
  }
}
EOF
```

## 8. Remove Unused Extensions (Performance)

1GB RAM VPSでは不要なextensionを除外することで応答時間を大幅短縮:

```bash
cd ~/openclaw

# dist/extensions - keep only anthropic + telegram
mkdir -p dist/extensions-disabled
for d in dist/extensions/*/; do
  name=$(basename "$d")
  if [ "$name" != "anthropic" ] && [ "$name" != "telegram" ] && [ "$name" != "node_modules" ]; then
    mv "$d" dist/extensions-disabled/
  fi
done

# dist-runtime/extensions - same
mkdir -p dist-runtime/extensions-disabled
for d in dist-runtime/extensions/*/; do
  name=$(basename "$d")
  if [ "$name" != "anthropic" ] && [ "$name" != "telegram" ]; then
    mv "$d" dist-runtime/extensions-disabled/
  fi
done
```

## 9. systemd Service

```bash
cat > /etc/systemd/system/openclaw.service << 'EOF'
[Unit]
Description=OpenClaw AI Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/openclaw
Environment=NODE_ENV=production
Environment=ANTHROPIC_API_KEY=YOUR_KEY
Environment=PATH=/usr/bin:/usr/local/bin:/root/.ows/bin
ExecStart=/usr/bin/node scripts/run-node.mjs gateway run --allow-unconfigured --verbose
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable openclaw
systemctl start openclaw
```

## 10. Verify

```bash
# Check skills
pnpm openclaw skills list --agent main | grep jpyc

# Check logs
journalctl -u openclaw -f

# Send a test message via Telegram
```
