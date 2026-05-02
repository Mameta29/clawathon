# Clawathon Tokyo Edition - Submission

## Track

**On-chain Settlement for AI** - エージェントによるステーブルコイン決済の自動執行

## Awards Target

### Best Agentic Commerce Use Case ($150)

> "Incorporate autonomous economic activity between agents (payments / commerce / treasury management)"

**本プロジェクトが該当する理由:**
- AIエージェントがJPYCステーブルコインで実際にEC商品を自律購入
- EIP-3009による署名ベースのガスレス決済を自動実行
- 定期購入（サブスクリプション）のcronスケジューリングによる継続的な経済活動
- 注文作成から署名提出、オンチェーン決済まで完全自律

### Best NEAR Tech Integration ($150)

> "Build an autonomous agent with a meaningful use of the NEAR tech stack (Private Inference, etc.)"

**本プロジェクトが該当する理由:**
- NEAR AI CloudのPrivate Inference（Intel TDX + NVIDIA TEE）を推論プロバイダーとして使用
- AIエージェントが処理する機密データ（配送先住所、購入金額、署名パラメータ）がTEE内で暗号化されたまま処理
- Agentic Commerceにおいて「AIが何を買ったか」をプロバイダーに知られない仕組みを実現
- OpenClaw上での実装により、NEAR AI Cloudの実用的なユースケースを提示

### World Award ($20,000 + 韓国イベント招待)

> 条件: Human Badge SDKの使用

**本プロジェクトが該当する理由:**
- World IDによるゼロ知識証明で「購入者が実在する人間」であることを認証
- AIエージェントによる大量購入・転売の防止（2024-2025年の日本のお米騰貴のような事態を防ぐ）
- 1人1認証のSybil耐性により、複数エージェントによる買い占めを阻止
- プライバシー保護: 個人情報を一切開示せずに人間であることだけを証明

## What We Built

Telegram Bot上で動くAI購入エージェント。自然言語で話しかけるだけで、JPYCステーブルコインを使ったEC購入を自律的に完了する。

### End-to-End Flow (実際に動作確認済み)

1. Telegram: 「テストショップでお米10kg買って」
2. AI (NEAR AI Cloud TEE内で推論): ショップ検索 → 商品一覧 → 残高確認 → 送料計算
3. AI: 注文サマリを提示 → ユーザー確認
4. AI: OWSでEIP-712署名生成 → JPYC EC APIに提出
5. AI: 「注文完了! ORD-20260501-ICM6EY」
6. 確認メール → ショップ管理画面に注文表示 → オンチェーン決済

### Technical Highlights

- **NEAR AI Cloud Private Inference**: ユーザーの個人情報・決済データがTEE内で暗号化処理。プロバイダーにも見えない
- **EIP-3009 ReceiveWithAuthorization**: ガスレス決済。ユーザーがガス代を払う必要なし
- **OWS (Open Wallet Standard)**: 秘密鍵をAES-256-GCMで暗号化保管。AIエージェントは署名APIのみ利用
- **3層セキュリティ**: AI推論のプライバシー（TEE）+ 秘密鍵保護（OWS）+ 決済安全性（EIP-3009）
- **VPS最適化**: 1GB RAM VPSで応答時間75秒→7秒に短縮（プラグイン最適化、thinking制御）
- **定期購入**: OpenClaw cronスケジューラで毎月自動注文

### Why Private Inference is Essential for Agentic Commerce

AIエージェントが決済を代行する未来では、以下の情報がAIモデルに送信されます：
- 配送先住所・氏名・電話番号
- 購入商品・金額
- ウォレットアドレス・署名パラメータ

通常のAPIではプロバイダーがこれらを平文で受け取ります。NEAR AI Cloudを使うことで、これらの機密データがTEE内で暗号化処理され、プロバイダー自身を含む誰にも公開されません。

**Agentic Commerceの実用化には、購買データのプライバシー保護が不可欠。本プロジェクトはNEAR AI Cloudでこの課題を解決しています。**

## Impact

- **高齢者・障害者のアクセシビリティ**: 複雑なUI操作不要、会話だけで購入完了
- **暗号資産決済の実用化**: ステーブルコインの「実際の買い物」ユースケース
- **AIエージェントの経済活動**: 人間の代理として自律的に決済を実行する基盤
- **プライバシー保護**: Private Inferenceにより、AIコマースのプライバシー課題を解決
