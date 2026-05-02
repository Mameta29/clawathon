# JPYC EC Agent

AIエージェントがJPYCステーブルコインでECサイトから自律的に商品を購入するシステム。

Telegram Bot経由で「お米買って」と話しかけるだけで、商品検索 → 残高確認 → 送料計算 → EIP-3009署名 → 注文完了まで全自動で実行します。

## Demo

Telegram Botに話しかけてください:

<p align="center">
  <img src="bot-qrcode.png" alt="Telegram Bot QR Code" width="200">
</p>

**Bot**: [@mameta_jpyc_ec_bot](https://t.me/mameta_jpyc_ec_bot)

## Architecture

```
User (Telegram)
  |
  v
OpenClaw Gateway (VPS)
  |
  ├── jpyc-ec-purchase skill  ... JPYC EC APIで商品検索・注文作成
  ├── ows skill                ... EIP-712署名生成（秘密鍵はOWSが管理）
  └── recurring-purchase skill ... cron定期購入スケジューリング
  |
  v
JPYC EC Platform API (stg-ec.jpyc-service.com)
  |
  v
On-chain Settlement (EIP-3009 ReceiveWithAuthorization)
```

## How It Works

1. **ユーザーがTelegramでメッセージ送信** - 「テストショップでお米買って」
2. **AIエージェントが購入スキルを実行** - ショップ検索、商品選択、残高確認、送料計算
3. **ユーザーに確認** - 注文サマリを表示し、承認を得る
4. **OWSでEIP-712署名を生成** - 秘密鍵はOWS Vaultで暗号化管理、エージェントは直接触れない
5. **署名をJPYC EC APIに提出** - EIP-3009 `ReceiveWithAuthorization` でガスレス決済
6. **注文完了** - 注文番号と確認メールが届く

## Key Features

- **ガスレス決済**: EIP-3009による署名ベースの送金。ユーザーはガス代不要
- **秘密鍵の安全管理**: OWS (Open Wallet Standard) がAES-256-GCMで暗号化保管。エージェントは署名APIのみを呼び出し、秘密鍵に直接アクセスしない
- **定期購入**: OpenClaw cronスケジューラで毎月自動購入を設定可能
- **対話型UX**: Telegramでの自然な日本語会話で購入フロー全体を完結
- **マルチチェーン対応**: JPYC ECはEthereum, Polygon, Avalancheに対応（デモはSepolia testnet）

## Skills

| Skill | Description |
|---|---|
| [jpyc-ec-purchase](skills/jpyc-ec-purchase/SKILL.md) | JPYC ECの購入フロー全体（API呼び出し、署名、注文） |
| [recurring-purchase](skills/recurring-purchase/SKILL.md) | OpenClaw cronによる定期購入スケジューリング |
| [ows](skills/ows/SKILL.md) | OWSウォレット管理・EIP-712署名生成 |

## Tech Stack

| Component | Technology |
|---|---|
| AI Runtime | [OpenClaw](https://github.com/openclaw/openclaw) |
| LLM | Anthropic Claude Sonnet 4.6 |
| Messaging | Telegram Bot API |
| Wallet | [OWS (Open Wallet Standard)](https://openwallet.sh) |
| Payment | EIP-3009 (ReceiveWithAuthorization) |
| Stablecoin | JPYC (JPY Coin) |
| EC Platform | [JPYC EC](https://stg-ec.jpyc-service.com) |
| Hosting | ConoHa VPS (Ubuntu 24.04) |

## Setup

### Prerequisites

- Node.js 22+
- pnpm
- OWS CLI (`curl -fsSL https://docs.openwallet.sh/install.sh | bash`)
- OpenClaw (`git clone https://github.com/openclaw/openclaw && pnpm install && pnpm build`)
- Telegram Bot Token (via [@BotFather](https://t.me/BotFather))
- Anthropic API Key

### 1. Install Skills

```bash
git clone https://github.com/Mameta29/jpyc-ec-agent.git
cp -r jpyc-ec-agent/skills/* ~/.agents/skills/
```

### 2. Create OWS Wallet

```bash
ows wallet create --name jpyc-agent
```

### 3. Configure OpenClaw

```bash
# Set Telegram bot token
pnpm openclaw config set channels.telegram.botToken "YOUR_BOT_TOKEN"
pnpm openclaw config set channels.telegram.enabled true

# Set model
pnpm openclaw config set agents.list.0.model anthropic/claude-sonnet-4-6

# Optimize: disable unnecessary plugins
pnpm openclaw config set plugins.allow '["anthropic","telegram"]'

# Optimize: disable extended thinking
pnpm openclaw config set agents.defaults.thinkingDefault off
pnpm openclaw config set agents.list.0.thinkingDefault off
```

### 4. Run

```bash
pnpm openclaw gateway run --allow-unconfigured
```

### Performance Optimization

VPS (1GB RAM) での運用時、以下の最適化で応答時間を **75秒 → 7秒** に短縮:

| Optimization | Before | After | Impact |
|---|---|---|---|
| Plugin allowlist (`anthropic` + `telegram` only) | 117 plugins loaded | 2 plugins loaded | -25s |
| Remove unused provider extensions from `dist/` and `dist-runtime/` | 60+ providers loaded per message | 0 extra providers | -20s |
| `thinkingDefault: off` | 21s thinking overhead | 0s | -21s |
| Sonnet 4.6 (vs Opus) | Slow generation | Fast generation | -5s |

## Hackathon

**Clawathon Tokyo Edition** (Next AI Leaders Hackathon)

Track: **On-chain Settlement for AI** - エージェントによるステーブルコイン決済の自動執行

## License

MIT
