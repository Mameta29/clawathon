---
name: recurring-purchase
description: Set up, manage, and cancel recurring (subscription) purchases via OpenClaw cron scheduler. Use this skill when a user wants to buy something regularly — monthly, weekly, or on any schedule. Works with any purchase skill (e.g. jpyc-ec-purchase). Triggers on keywords like 定期購入/サブスク/毎月/毎週/定期的/recurring/subscription/schedule/auto-buy.
version: 1.0.0
metadata:
  openclaw:
    emoji: "🔄"
---

# Recurring Purchase Skill

OpenClaw の Gateway cron scheduler を使って、定期購入（サブスクリプション）を登録・管理するスキル。

購入処理自体は `jpyc-ec-purchase` 等の購入スキルに委譲する。このスキルはスケジューリングのみを担当。

---

## Architecture

```
[cron scheduler] ──スケジュール実行──▶ [main session] ──skill実行──▶ [購入スキル]
```

---

## Conversation Flow

### 新規登録

1. ユーザーに確認する項目：
   - **何を買うか**: ショップ名/slug、商品名
   - **頻度**: 毎月○日 / 毎週○曜日 / ○日ごと
   - **時刻**: デフォルト 09:00 JST
   - **配送先**: デモプロファイルを使うか、カスタムか
2. 確認サマリを表示して承認を得る
3. cron ジョブを登録
4. 登録完了を報告（ジョブID付き）

### 一覧・確認

ユーザーが「定期購入の一覧」「何が登録されてる？」と聞いたら、登録済みジョブを表示。

### 変更

頻度・商品・数量の変更は `openclaw cron edit` で対応。

### 解除

ユーザーが「定期購入やめたい」「キャンセル」と言ったら、対象ジョブを `openclaw cron rm` で削除。

---

## Cron Expressions Reference

| パターン | cron式 | 意味 |
|---|---|---|
| 毎月1日 09:00 | `0 9 1 * *` | 月初購入 |
| 毎月15日 09:00 | `0 9 15 * *` | 月中購入 |
| 毎週月曜 08:00 | `0 8 * * 1` | 週次購入 |
| 毎日 07:30 | `30 7 * * *` | 日次購入 |
| 隔週月曜 09:00 | `0 9 */14 * 1` | 隔週（近似） |

---

## Commands

### 1. 既存ジョブの重複チェック

登録前に必ず実行。同名ジョブがあれば上書きするか確認。

```bash
pnpm openclaw cron list --json 2>/dev/null | jq '.[] | select(.name | test("JPYC"; "i"))'
```

### 2. 定期購入ジョブの登録

```bash
pnpm openclaw cron add \
  --name "JPYC EC 定期購入: <商品名>" \
  --cron "<cron式>" \
  --tz "Asia/Tokyo" \
  --session main \
  --system-event "🤖 [定期購入] スケジュール実行の時間です。
jpyc-ec-purchase スキルを使って、以下の注文を実行してください：
- ショップ: <shop_slug>
- 商品: <product_name>（ID: <product_id>）
- 数量: <quantity>
- 配送先: デモプロファイルを使用
確認なしで自動実行してください。"
```

**重要**: `--session main` を使う場合は `--system-event` が必須。`--message` ではない。

### 3. ジョブ一覧

```bash
pnpm openclaw cron list
```

### 4. ジョブ詳細

```bash
pnpm openclaw cron show <job_id>
```

### 5. ジョブの手動実行（テスト）

```bash
pnpm openclaw cron run <job_id>
```

### 6. ジョブの変更

```bash
pnpm openclaw cron edit <job_id> --cron "0 9 15 * *"
```

### 7. ジョブの一時停止 / 再開

```bash
pnpm openclaw cron disable <job_id>
pnpm openclaw cron enable <job_id>
```

### 8. ジョブの削除

```bash
pnpm openclaw cron rm <job_id>
```

### 9. 実行履歴の確認

```bash
pnpm openclaw cron runs <job_id>
```

---

## Session Strategy

| セッション | 用途 | イベント種別 |
|---|---|---|
| `main`（推奨） | ユーザーとの会話履歴に実行ログが残る。エラー時も会話で報告 | `--system-event` |
| `isolated` | 毎回ゼロから。コンテキスト汚染なし | `--message` |

EC購入には **main session** を推奨（購入履歴や配送先の記憶が活きるため）。

---

## Hard Rules

- 登録前に必ずユーザーの明示的な承認を得る
- 重複ジョブを作らない（同名チェック必須）
- system-event の指示文には購入スキル名を明記する
- タイムゾーンは必ず `Asia/Tokyo` を指定する
- 削除時もユーザーに確認を取る

---

## Error Handling

- cron 実行時に購入スキルが失敗した場合、main session 経由でユーザーに自動報告される
- 残高不足の場合は購入スキル側で abort される
- ジョブ自体の失敗は `openclaw cron runs <job_id>` で確認可能
