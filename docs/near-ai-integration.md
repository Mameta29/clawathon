# NEAR AI Cloud Integration

JPYC EC AgentはNEAR AI Cloudのプライベート推論を使用してAI処理を実行します。

## Why NEAR AI Cloud

- **プライベート推論**: Intel TDX + NVIDIA TEE環境でプロンプトが暗号化されたまま処理される
- **検証可能性**: 推論結果に暗号署名が付与され、改ざん検知が可能
- **OpenAI互換API**: 既存のOpenAI SDKをそのまま使用可能
- **コスト**: ハッカソン参加者にはクレジットが提供される

## Architecture

```
User (Telegram)
  → OpenClaw Gateway
    → NEAR AI Cloud (cloud-api.near.ai)
      → Claude Sonnet 4.5 (TEE内で推論)
    ← 暗号署名付き応答
  → JPYC EC Purchase Skill実行
    → OWS署名 → JPYC EC API → On-chain Settlement
```

## Configuration

### 1. OpenClaw config (openclaw.json)

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "nearai": {
        "baseUrl": "https://cloud-api.near.ai/v1",
        "apiKey": "${NEARAI_API_KEY}",
        "api": "openai-completions",
        "models": [
          {
            "id": "anthropic/claude-sonnet-4-5",
            "name": "Claude Sonnet 4.5 (NEAR AI Cloud)",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "agents": {
    "list": [
      {
        "model": "nearai/anthropic/claude-sonnet-4-5"
      }
    ]
  }
}
```

### 2. Available Models on NEAR AI Cloud

| Model | ID | Use Case |
|---|---|---|
| Claude Sonnet 4.5 | `anthropic/claude-sonnet-4-5` | Primary (best for tool use + Japanese) |
| GLM-5 | `zai-org/GLM-5-FP8` | Alternative (recommended by NEAR) |
| Qwen 3.5 | `Qwen/Qwen3.5-122B-A10B` | Alternative (recommended by NEAR) |

### 3. API Verification

```bash
# Test NEAR AI Cloud connectivity
curl -s "https://cloud-api.near.ai/v1/models" \
  -H "Authorization: Bearer $NEARAI_API_KEY" | jq '.data[].id'

# Test inference
curl -s "https://cloud-api.near.ai/v1/chat/completions" \
  -H "Authorization: Bearer $NEARAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"anthropic/claude-sonnet-4-5","max_tokens":50,"messages":[{"role":"user","content":"Hello"}]}'
```

## Security Benefits

NEAR AI Cloudを使うことで、JPYC EC Agentの推論処理にプライバシー保護が追加されます:

1. **購入意図の秘匿**: ユーザーの購入リクエストがTEE内で処理され、インフラプロバイダーにも見えない
2. **署名データの保護**: EIP-712署名の構築プロセスがTEE内で完結
3. **検証可能性**: 推論結果の暗号署名により、AI応答の改ざんを検知可能

## References

- [NEAR AI Cloud Documentation](https://docs.near.ai/cloud/introduction)
- [NEAR AI Cloud Skill](https://github.com/near/agent-skills/tree/main/skills/near-ai-cloud)
- [Verification Example](https://github.com/near-examples/nearai-cloud-verification-example)
