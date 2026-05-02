# Clawathon Tokyo Edition - Submission

## Track

**On-chain Settlement for AI** - エージェントによるステーブルコイン決済の自動執行

## What We Built

Telegram Bot上で動くAI購入エージェント。自然言語で話しかけるだけで、JPYCステーブルコインを使ったEC購入を自律的に完了する。

### End-to-End Flow (実際に動作確認済み)

1. Telegram: 「テストショップでお米10kg買って」
2. AI: ショップ検索 → 商品一覧 → 残高確認 → 送料計算
3. AI: 注文サマリを提示 → ユーザー確認
4. AI: OWSでEIP-712署名生成 → JPYC EC APIに提出
5. AI: 「注文完了! ORD-20260501-ICM6EY」
6. 確認メール → ショップ管理画面に注文表示 → オンチェーン決済

### Technical Highlights

- **EIP-3009 ReceiveWithAuthorization**: ガスレス決済。ユーザーがガス代を払う必要なし
- **OWS (Open Wallet Standard)**: 秘密鍵をAES-256-GCMで暗号化保管。AIエージェントは署名APIのみ利用
- **OpenClaw Skill System**: 再利用可能なSkillとして実装。他のECサイトにも応用可能
- **VPS最適化**: 1GB RAM VPSで応答時間75秒→7秒に短縮（プラグイン最適化、thinking制御）
- **定期購入**: OpenClaw cronスケジューラで毎月自動注文

## Impact

- **高齢者・障害者のアクセシビリティ**: 複雑なUI操作不要、会話だけで購入完了
- **暗号資産決済の実用化**: ステーブルコインの「実際の買い物」ユースケース
- **AIエージェントの経済活動**: 人間の代理として自律的に決済を実行する基盤
