---
name: jpyc-ec-purchase
description: Purchase products from JPYC EC Platform shops on Sepolia testnet using JPYC stablecoin with gasless EIP-3009 payments. Use this skill whenever the user wants to buy something, browse shops or products, place an order, or pay with JPYC. Triggers on Japanese keywords like 買う/購入/注文/ショップ/JPYC/EC and English like buy/purchase/order/shop/JPYC. Always invokes the ows skill for EIP-712 signature generation — never asks for or handles private keys directly.
version: 1.0.0
metadata:
  openclaw:
    requires:
      anyBins:
        - ows
        - curl
        - jq
    emoji: "\U0001F6D2"
---

# JPYC EC Purchase Skill (Sepolia / Demo Edition)

JPYC EC Platform のステージング環境で、Sepoliaテストネット上のJPYCを使ってガスレス決済 (EIP-3009) を実行するスキル。

**署名は必ず `ows` skill 経由で行う。秘密鍵をこの context に持ち込まない。**

---

## Fixed Environment (do not change)

- API Base: `https://stg-ec.jpyc-service.com/api/v1`
- Chain: Sepolia (`chain_id: 11155111`)
- JPYC Contract: `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`
- Agent Wallet (OWS managed): `0x99CA388515B8F1bB9B2Ef6395d92b9F240a6e874`
- OWS wallet name: `jpyc-agent`

## Demo Profile (default when user opts for demo)

- name: デモ太郎
- email: mameta.zk@gmail.com
- prefecture: 東京都
- address1: 千代田区神田駿河台4-6 御茶ノ水ソラシティ
- zip: 101-0062
- tel: 03-0000-0000

## Recommended Demo Shop & Product

- Shop slug: `shigaoumimai` (テストショップv2)
- Demo product: `テスト` (id: `e50a260a-846a-4f51-bd58-1b52447bad5d`, 100 JPYC, requires shipping)

---

## Conversation Flow (Telegram-friendly)

1. 挨拶 + 何が欲しいか聞く
2. 商品候補を `GET /shops/{slug}/products` で確認して提示
3. 配送先が必要な商品なら、ユーザーに「デモプロファイルを使う / 自分で入力する」の二択を提示
4. 残高チェック、送料計算、注文サマリ提示
5. 「✅ 署名して送信 / ❌ キャンセル」を必ず確認してからowsを呼ぶ
6. 署名生成 (ows) → 署名提出 (API)
7. 注文番号 + 「mameta.zk@gmail.com 宛に購入完了メールが届きます」と返信

---

## API Calls

### 1. Shop list (Sepolia-capable)

```bash
curl -s "https://stg-ec.jpyc-service.com/api/v1/shops" \
  | jq '.data.shops[] | select(.available_chains[] == 11155111)'
```

### 2. Product list

```bash
curl -s "https://stg-ec.jpyc-service.com/api/v1/shops/<slug>/products" | jq
```

Note `shop.id`, `shop.wallet_address`, and each `product.id` / `price_jpyc` / `stock` / `requires_shipping` / `variants`.

### 3. Balance check (run before every order)

```bash
curl -s -X POST "https://stg-ec.jpyc-service.com/api/v1/balance/check" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x99CA388515B8F1bB9B2Ef6395d92b9F240a6e874",
    "required_amount": "100",
    "chain_id": 11155111
  }' | jq
```

If `sufficient: false`, abort.

### 4. Shipping fee (only if requires_shipping)

```bash
curl -s -X POST "https://stg-ec.jpyc-service.com/api/v1/shipping/fee" \
  -H "Content-Type: application/json" \
  -d '{
    "shop_id": "<shop_id>",
    "prefecture": "東京都",
    "items": [{"product_id": "<pid>", "quantity": 1}]
  }' | jq
```

### 5. Create order

```bash
curl -s -X POST "https://stg-ec.jpyc-service.com/api/v1/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "shop_id": "<shop_id>",
    "customer_address": "0x99CA388515B8F1bB9B2Ef6395d92b9F240a6e874",
    "customer_name": "デモ太郎",
    "customer_email": "mameta.zk@gmail.com",
    "chain_id": 11155111,
    "items": [{"product_id": "<pid>", "quantity": 1}],
    "shipping_prefecture": "東京都",
    "shipping_address1": "千代田区神田駿河台4-6 御茶ノ水ソラシティ",
    "shipping_zip": "101-0062",
    "shipping_tel": "03-0000-0000"
  }' | jq
```

For products with `variants != null`, add `"variant_selections": {"<option_name>": "<value>"}` inside the item.

Save from response: `order.id`, `order.nonce`, `order.valid_after`, `order.valid_before`, `order.total_jpyc`, `shop_wallet_address`.

### 6. Sign with OWS (EIP-712 typed data)

Convert `total_jpyc` (e.g. "100.000000000000000000") to a wei integer string by appending 18 zeros to the integer part: `100` → `100000000000000000000`.

Build a typed-data JSON file and pass it to `ows sign message`:

```bash
cat > /tmp/jpyc_typed_data.json << 'EOF'
{
  "domain": {
    "name": "JPY Coin",
    "version": "1",
    "chainId": 11155111,
    "verifyingContract": "0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29"
  },
  "types": {
    "EIP712Domain": [
      {"name": "name", "type": "string"},
      {"name": "version", "type": "string"},
      {"name": "chainId", "type": "uint256"},
      {"name": "verifyingContract", "type": "address"}
    ],
    "ReceiveWithAuthorization": [
      {"name": "from", "type": "address"},
      {"name": "to", "type": "address"},
      {"name": "value", "type": "uint256"},
      {"name": "validAfter", "type": "uint256"},
      {"name": "validBefore", "type": "uint256"},
      {"name": "nonce", "type": "bytes32"}
    ]
  },
  "primaryType": "ReceiveWithAuthorization",
  "message": {
    "from": "0x99CA388515B8F1bB9B2Ef6395d92b9F240a6e874",
    "to": "<SHOP_WALLET_FROM_ORDER_RESPONSE>",
    "value": "<TOTAL_IN_WEI>",
    "validAfter": "<order.valid_after>",
    "validBefore": "<order.valid_before>",
    "nonce": "<order.nonce>"
  }
}
EOF

# Replace placeholders with actual values from the order response, then:
SIGNATURE=$(ows sign message \
  --wallet jpyc-agent \
  --chain evm \
  --message "" \
  --typed-data "$(cat /tmp/jpyc_typed_data.json)" \
  --json | jq -r '.signature')

echo "Signature: $SIGNATURE"
```

Critical:
- domain.name MUST be exactly "JPY Coin"
- verifyingContract MUST be 0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29
- from MUST equal 0x99CA388515B8F1bB9B2Ef6395d92b9F240a6e874
- value is wei (18 decimals appended)
- nonce is the 0x-prefixed bytes32 from order response

### 7. Submit signature

```bash
curl -s -X POST "https://stg-ec.jpyc-service.com/api/v1/orders/<order_id>/signature" \
  -H "Content-Type: application/json" \
  -d "{
    \"signature\": \"$SIGNATURE\",
    \"customer_address\": \"0x99CA388515B8F1bB9B2Ef6395d92b9F240a6e874\"
  }" | jq
```

Success: `data.order_status: 2` and `data.order_number: "ORD-XXXXXX"`.

### 8. Track orders (optional)

```bash
curl -s "https://stg-ec.jpyc-service.com/api/v1/orders?customer_address=0x99CA388515B8F1bB9B2Ef6395d92b9F240a6e874" | jq
```

---

## Hard Rules

- Never ask the user for a private key or mnemonic
- Never log/print private keys; always go through `ows`
- chain_id is always 11155111
- customer_address is always `0x99CA388515B8F1bB9B2Ef6395d92b9F240a6e874`
- Always run balance check before order creation
- Always get explicit user confirmation before invoking `ows sign`
- If user says cancel/no/stop, abort immediately

## Order Status

| Status | Meaning |
|--------|---------|
| 1 | Created (awaiting signature) |
| 2 | Signed (awaiting shop collection) |
| 3 | Collected (on-chain settlement complete) |
| 9 | Expired or cancelled |
