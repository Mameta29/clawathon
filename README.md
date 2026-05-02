# JPYC EC Agent

AIエージェントがJPYCステーブルコインでECサイトから自律的に商品を購入するシステム。

Telegram Bot経由で「お米買って」と話しかけるだけで、商品検索 → 残高確認 → 送料計算 → EIP-3009署名 → 注文完了まで全自動で実行します。

**AI推論はNEAR AI CloudのPrivate Inference（TEE）内で実行され、ユーザーの個人情報・決済データはプロバイダーにも一切公開されません。**

## Demo

Telegram Botに話しかけてください:

<p align="center">
  <img src="bot-qrcode.png" alt="Telegram Bot QR Code" width="200">
</p>

**Bot**: [@mameta_jpyc_ec_bot](https://t.me/mameta_jpyc_ec_bot)

## Why Private Inference Matters for Agentic Commerce

AIエージェントが決済を代行する場合、以下の機密情報がAIモデルに送信されます：

| データ | リスク |
|---|---|
| 配送先住所・氏名・電話番号 | 個人情報漏洩 |
| 購入商品・金額 | 購買行動の追跡 |
| ウォレットアドレス | 資産残高の特定 |
| EIP-712署名パラメータ | 決済情報の傍受 |

通常のAPI呼び出しでは、これらが**プロバイダーのサーバーに平文で送信**されます。

```
[通常のAPI]
ユーザー → AIプロバイダー(平文でプロンプトを処理) → 応答
           ⚠️ プロバイダーが購入データを閲覧可能
```

NEAR AI CloudのPrivate Inferenceでは、**Intel TDX + NVIDIA TEEの暗号化環境内**で推論が実行されます：

```
[NEAR AI Cloud Private Inference]
ユーザー → TEE(暗号化された金庫内で処理) → 暗号署名付き応答
           ✅ NEAR自身を含め、誰もプロンプトを閲覧不可
```

**Agentic Commerceが実用化されるためには、「AIエージェントが何を買ったか」をAIプロバイダーに知られない仕組みが不可欠です。** 本プロジェクトはNEAR AI Cloudを使うことで、この課題を解決しています。

## Architecture

```
User (Telegram)
  |
  v
OpenClaw Gateway (VPS)
  |
  ├── NEAR AI Cloud (Private Inference / TEE)
  │     └── Claude Sonnet 4.5 (暗号化環境内で推論)
  │
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
2. **NEAR AI CloudのTEE内でAI推論を実行** - プロンプト（個人情報含む）は暗号化されたまま処理
3. **AIエージェントが購入スキルを実行** - ショップ検索、商品選択、残高確認、送料計算
4. **ユーザーに確認** - 注文サマリを表示し、承認を得る
5. **OWSでEIP-712署名を生成** - 秘密鍵はOWS Vaultで暗号化管理、エージェントは直接触れない
6. **署名をJPYC EC APIに提出** - EIP-3009 `ReceiveWithAuthorization` でガスレス決済
7. **注文完了** - 注文番号と確認メールが届く

## Key Features

- **プライバシー保護された推論**: NEAR AI Cloud Private Inference（Intel TDX + NVIDIA TEE）でユーザーの購入データが暗号化されたまま処理
- **ガスレス決済**: EIP-3009による署名ベースの送金。ユーザーはガス代不要
- **秘密鍵の安全管理**: OWS (Open Wallet Standard) がAES-256-GCMで暗号化保管。エージェントは署名APIのみを呼び出し、秘密鍵に直接アクセスしない
- **定期購入**: OpenClaw cronスケジューラで毎月自動購入を設定可能
- **対話型UX**: Telegramでの自然な日本語会話で購入フロー全体を完結
- **マルチチェーン対応**: JPYC ECはEthereum, Polygon, Avalancheに対応（デモはSepolia testnet）

## Security Layers

本プロジェクトは3層のセキュリティで構成されています：

```
Layer 1: AI推論のプライバシー
  └── NEAR AI Cloud Private Inference (TEE)
       → 購入意図・個人情報がプロバイダーにも見えない

Layer 2: 秘密鍵の保護
  └── OWS Vault (AES-256-GCM + scrypt)
       → AIエージェントは署名APIのみ利用、秘密鍵に直接アクセス不可

Layer 3: 決済の安全性
  └── EIP-3009 ReceiveWithAuthorization
       → 送金先が注文ごとに限定、任意のアドレスへの送金は不可能
```

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
| AI Inference | [NEAR AI Cloud](https://cloud.near.ai) (Private Inference / TEE) |
| LLM | Claude Sonnet 4.5 (via NEAR AI Cloud) |
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
- NEAR AI Cloud API Key (from [cloud.near.ai](https://cloud.near.ai))

### 1. Install Skills

```bash
git clone https://github.com/Mameta29/clawathon.git
cp -r clawathon/skills/* ~/.agents/skills/
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

# Set NEAR AI Cloud as inference provider
pnpm openclaw config set agents.list.0.model nearai/anthropic/claude-sonnet-4-5

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
| Sonnet (vs Opus) | Slow generation | Fast generation | -5s |

## Hackathon

**Clawathon Tokyo Edition** (Next AI Leaders Hackathon)

- Track: **On-chain Settlement for AI** - エージェントによるステーブルコイン決済の自動執行
- NEAR Award: **Best Agentic Commerce Use Case** + **Best NEAR Tech Integration**

## License

MIT
