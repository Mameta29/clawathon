import express from "express";
import { signRequest } from "@worldcoin/idkit-core/signing";
import { createHash, randomBytes } from "crypto";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Config
const RP_SIGNING_KEY = "0x3451210ee50da1182ec8d445f959d0da2e4e35f4ae2773b0b8741d9b21a99c8b";
const APP_ID = "app_6510691f3f495a80334f07cb73106ae9";
const RP_ID = "rp_6c62438116ea14f3";
const ACTION = "clawathon";
const PORT = 80;
const TELEGRAM_BOT_TOKEN = "8700870370:AAE40wHFnYmQpmA_imrdy_ZZ8ptkK4jQ_QQ";

// In-memory verified users (telegram user id -> verification status)
const verifiedUsers = new Map();
// Nullifier store (action, nullifier) for replay protection
const nullifiers = new Set();
// Pending verifications: token -> telegram chat id
const pendingVerifications = new Map();

// Generate RP signature
app.post("/api/rp-signature", (req, res) => {
  try {
    const result = signRequest({
      signingKeyHex: RP_SIGNING_KEY,
      action: ACTION,
    });
    res.json({
      sig: result.sig,
      nonce: result.nonce,
      created_at: result.createdAt,
      expires_at: result.expiresAt,
    });
  } catch (err) {
    console.error("RP signature error:", err);
    res.status(500).json({ error: "Failed to generate signature" });
  }
});

// Start verification (called from Telegram bot skill)
app.post("/api/start-verify", async (req, res) => {
  const { chat_id, order_summary } = req.body;
  if (!chat_id) return res.status(400).json({ error: "chat_id required" });

  // Check if already verified
  const existing = verifiedUsers.get(String(chat_id));
  if (existing && existing.verified) {
    return res.json({ already_verified: true, verify_url: null, token: null });
  }

  const token = randomBytes(16).toString("hex");
  pendingVerifications.set(token, { chat_id, created: Date.now() });

  // Clean old tokens (older than 10 min)
  for (const [t, v] of pendingVerifications) {
    if (Date.now() - v.created > 600000) pendingVerifications.delete(t);
  }

  const verifyUrl = `http://160.251.253.102/verify.html?token=${token}`;

  // Send inline button directly via Telegram Bot API
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chat_id,
        text: "🌐 World IDで本人確認 + 購入承認をしてね！\n\n下のボタンを押してWorld Appで認証してください。",
        reply_markup: {
          inline_keyboard: [[{ text: "🌐 World IDで認証して購入する", url: verifyUrl }]],
        },
      }),
    });
  } catch (tgErr) {
    console.error("Telegram inline button error:", tgErr);
  }

  res.json({ verify_url: verifyUrl, token, button_sent: true });
});

// Verify proof (called from frontend after World ID verification)
app.post("/api/verify-proof", async (req, res) => {
  const { token, idkitResponse } = req.body;
  console.log("Received idkitResponse keys:", Object.keys(idkitResponse || {}));

  if (!token || !idkitResponse) {
    return res.status(400).json({ error: "token and idkitResponse required" });
  }

  const pending = pendingVerifications.get(token);
  if (!pending) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  try {
    // IDKit wraps proof in { success: true, result: { action, responses, ... } }
    // Extract the actual proof data
    const proofData = idkitResponse.result || idkitResponse;

    // Ensure action is present
    if (!proofData.action) {
      proofData.action = ACTION;
    }

    console.log("Sending to World ID verify:", JSON.stringify(proofData, null, 2));

    // Forward proof to World ID verification endpoint
    const verifyRes = await fetch(
      `https://developer.world.org/api/v4/verify/${RP_ID}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(proofData),
      }
    );

    if (!verifyRes.ok) {
      const err = await verifyRes.text();
      console.error("World ID verify failed:", err);
      return res.status(400).json({ error: "Verification failed", detail: err });
    }

    const verifyResult = await verifyRes.json();
    console.log("World ID verify success:", JSON.stringify(verifyResult));

    // Check nullifier for replay protection
    const responses = proofData.responses || [];
    for (const r of responses) {
      const nullKey = `${ACTION}:${r.nullifier}`;
      if (nullifiers.has(nullKey)) {
        return res.status(400).json({ error: "Already verified with this credential" });
      }
      nullifiers.add(nullKey);
    }

    // Mark user as verified
    verifiedUsers.set(String(pending.chat_id), {
      verified: true,
      verifiedAt: Date.now(),
    });
    pendingVerifications.delete(token);

    console.log(`User ${pending.chat_id} verified via World ID`);

    // Notify user via Telegram Bot API with a reply keyboard
    const chatId = pending.chat_id;
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "✅ World ID認証完了！購入が承認されました。\n\n下のボタンを押すと署名・決済が始まります。",
          reply_markup: {
            keyboard: [[{ text: "署名して購入を完了する" }]],
            one_time_keyboard: true,
            resize_keyboard: true,
          },
        }),
      });
    } catch (tgErr) {
      console.error("Telegram notify error:", tgErr);
    }

    res.json({ success: true, chat_id: pending.chat_id });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

// Check if user is verified (called by OpenClaw skill)
app.get("/api/check-verified/:chat_id", (req, res) => {
  const user = verifiedUsers.get(req.params.chat_id);
  res.json({ verified: !!user?.verified, data: user || null });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`World ID verify server running on port ${PORT}`);
});
