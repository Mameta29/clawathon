# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User (Telegram)                          │
│                   「お米10kg買って」                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ConoHa VPS (Ubuntu 24.04)                     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              OpenClaw Gateway (Node.js 22)                │  │
│  │                                                           │  │
│  │  ┌─────────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │ jpyc-ec-purchase │  │  recurring-  │  │     ows     │  │  │
│  │  │     Skill        │  │  purchase    │  │    Skill    │  │  │
│  │  │                  │  │   Skill      │  │             │  │  │
│  │  │ - Shop search    │  │              │  │ - Wallet    │  │  │
│  │  │ - Product list   │  │ - Cron setup │  │   management│  │  │
│  │  │ - Balance check  │  │ - Schedule   │  │ - EIP-712   │  │  │
│  │  │ - Shipping calc  │  │   management │  │   signing   │  │  │
│  │  │ - Order creation │  │ - Cancel     │  │ - Key vault │  │  │
│  │  │ - Signature      │  │              │  │   (AES-256) │  │  │
│  │  │   submission     │  │              │  │             │  │  │
│  │  └────────┬─────────┘  └──────────────┘  └──────┬──────┘  │  │
│  │           │                                      │         │  │
│  └───────────┼──────────────────────────────────────┼─────────┘  │
│              │                                      │            │
└──────────────┼──────────────────────────────────────┼────────────┘
               │                                      │
               ▼                                      ▼
┌──────────────────────────┐          ┌───────────────────────────┐
│   JPYC EC Platform API   │          │    OWS Vault (~/.ows/)    │
│                          │          │                           │
│ stg-ec.jpyc-service.com  │          │ Encrypted keystore        │
│                          │          │ AES-256-GCM + scrypt KDF  │
│ - GET  /shops            │          │                           │
│ - GET  /shops/:slug/     │          │ jpyc-agent wallet         │
│        products          │          │ 0x99CA388515B8F1bB...     │
│ - POST /balance/check    │          └───────────────────────────┘
│ - POST /shipping/fee     │
│ - POST /orders           │
│ - POST /orders/:id/      │
│        signature         │
└──────────────────────────┘
               │
               ▼
┌──────────────────────────┐
│   Blockchain (Sepolia)   │
│                          │
│ JPYC Contract:           │
│ 0xE7C3D8C9a439feDe...   │
│                          │
│ EIP-3009                 │
│ ReceiveWithAuthorization │
│ (Gasless settlement)     │
└──────────────────────────┘
```

## Payment Flow (EIP-3009)

```
1. Agent creates order via JPYC EC API
   → Receives: nonce, validAfter, validBefore, total_jpyc

2. Agent constructs EIP-712 typed data:
   domain: { name: "JPY Coin", version: "1", chainId: 11155111, verifyingContract: JPYC_ADDRESS }
   message: { from: AGENT_WALLET, to: SHOP_WALLET, value: TOTAL_WEI, validAfter, validBefore, nonce }

3. OWS signs the typed data (private key never exposed)
   → Returns: signature (65 bytes, r+s+v)

4. Agent submits signature to JPYC EC API
   → JPYC EC calls ReceiveWithAuthorization on-chain
   → Shop receives JPYC, order status → "Signed"

5. Shop collects payment on-chain
   → Order status → "Collected"
```

## Security Model

- **Private keys**: Never exposed to the AI agent. OWS encrypts at rest (AES-256-GCM, scrypt KDF) and signs in-process
- **Authorization scope**: Agent can only sign `ReceiveWithAuthorization` (push payment to shop). Cannot transfer to arbitrary addresses
- **User confirmation**: Agent always asks for explicit approval before signing
- **Balance check**: Mandatory before every order to prevent failed transactions
