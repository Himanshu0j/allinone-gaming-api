// Interactive API Documentation & Developer Sandbox Module
const Documentation = {
  currentLang: 'node',

  init() {
    this.bindEvents();
    this.renderCodeSnippets();
  },

  bindEvents() {
    // Language tabs
    document.querySelectorAll('.doc-lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.doc-lang-btn').forEach(b => {
          b.classList.remove('bg-amber-500', 'text-black', 'font-bold');
          b.classList.add('bg-zinc-800/80', 'text-zinc-400');
        });
        btn.classList.add('bg-amber-500', 'text-black', 'font-bold');
        btn.classList.remove('bg-zinc-800/80', 'text-zinc-400');

        this.currentLang = btn.getAttribute('data-lang');
        this.renderCodeSnippets();
      });
    });

    // Encryption playground submit
    const encForm = document.getElementById('encryptPlaygroundForm');
    if (encForm) {
      encForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.runEncryptionTest();
      });
    }

    // Webhook simulation test
    const webhookBtn = document.getElementById('testWebhookBtn');
    if (webhookBtn) {
      webhookBtn.addEventListener('click', () => {
        this.runWebhookTest();
      });
    }
  },

  snippets: {
    node: {
      catalog: `// Fetch 139 Providers and Games Catalog
const fetch = require('node-fetch');

async function loadCatalog() {
  // 1. Get all providers
  const res = await fetch('https://yourdomain.com/api/providers');
  const { providers } = await res.json();
  console.log('Total Licensed Brands:', providers.length);

  // 2. Get games for selected brand (e.g. 100HP id=131)
  const gamesRes = await fetch('https://yourdomain.com/api/brands/131/games');
  const { games } = await gamesRes.json();
  games.forEach(g => console.log(\`\${g.game_name} -> \${g.game_code}\`));
}
loadCatalog();`,

      launch: `// AllInOne API Launch Game (Server-Side Node.js)
const crypto = require('crypto');

const API_URL = 'https://api.allinoneapi.com/launch';
const API_TOKEN = 'YOUR_API_TOKEN';
const API_SECRET = '32_BYTE_SECRET_KEY_HERE_123456'; // Exactly 32 chars

function pkcs7Pad(buf, block = 16) {
  const pad = block - (buf.length % block);
  return Buffer.concat([buf, Buffer.alloc(pad, pad)]);
}

function aes256EcbEncrypt(plaintext, key32) {
  const cipher = crypto.createCipheriv('aes-256-ecb', Buffer.from(key32), null);
  cipher.setAutoPadding(false);
  const padded = pkcs7Pad(Buffer.from(plaintext, 'utf8'));
  return Buffer.concat([cipher.update(padded), cipher.final()]).toString('base64');
}

async function launchForPlayer(userId, gameUid, balance = 100.0) {
  const payload = {
    user_id: userId,
    balance: balance,
    game_uid: gameUid,
    token: API_TOKEN,
    timestamp: Date.now(),
    return: 'https://yoursite.com/lobby',
    callback: 'https://yoursite.com/api/webhook',
    language: 'en',
    currency_code: 'INR'
  };

  const body = {
    token: API_TOKEN,
    payload: aes256EcbEncrypt(JSON.stringify(payload), API_SECRET)
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (data.code === 0) {
    return data.data.url; // Load in iframe or redirect player
  }
  throw new Error(data.msg || 'Launch failed');
}`,

      callback: `// SoftAPI Webhook Handler (Express.js)
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/webhook', (req, res) => {
  const event = req.body;
  // If encrypted wire format: event = { payload: "base64...", timestamp: ... }
  // When decrypted:
  // {
  //   member_account: "1001",
  //   bet_amount: 10.50,
  //   win_amount: 25.00,
  //   game_uid: "8771",
  //   game_round: "RND_982314",
  //   notify_only: true
  // }

  console.log('[SOFTAPI WEBHOOK]', event);

  // Update your local user balance / ledger idempotently using event.game_round
  // Always respond HTTP 200 within 2 seconds
  res.json({ code: 0, msg: 'OK' });
});`
    },

    php: {
      catalog: `<?php
// Fetch Providers and Games Catalog
$providers = json_decode(file_get_contents('https://yourdomain.com/api/providers'), true);
echo "Total Providers: " . count($providers['providers']) . PHP_EOL;

// Get games for brand 131
$games = json_decode(file_get_contents('https://yourdomain.com/api/brands/131/games'), true);
foreach ($games['games'] as $g) {
    echo $g['game_name'] . " => " . $g['game_code'] . PHP_EOL;
}`,

      launch: `<?php
declare(strict_types=1);

$apiUrl = 'https://api.allinoneapi.com/launch';
$token  = 'YOUR_API_TOKEN';
$secret = '32_BYTE_SECRET_KEY_HERE_123456'; // 32 characters

function pkcs7_pad(string $data, int $block = 16): string {
    $pad = $block - (strlen($data) % $block);
    return $data . str_repeat(chr($pad), $pad);
}

function aes256ecb_encrypt(string $plaintext, string $key32): string {
    $padded = pkcs7_pad($plaintext);
    $raw = openssl_encrypt($padded, 'AES-256-ECB', $key32, OPENSSL_RAW_DATA | OPENSSL_ZERO_PADDING);
    return base64_encode($raw);
}

$payload = [
    'user_id'       => 1001,
    'balance'       => 100.00,
    'game_uid'      => '8771',
    'token'         => $token,
    'timestamp'     => (int) round(microtime(true) * 1000),
    'return'        => 'https://yoursite.com/lobby',
    'callback'      => 'https://yoursite.com/api/callback.php',
    'language'      => 'en',
    'currency_code' => 'INR'
];

$body = json_encode([
    'token'   => $token,
    'payload' => aes256ecb_encrypt(json_encode($payload), $secret)
]);

$ch = curl_init($apiUrl);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true
]);
$resp = json_decode(curl_exec($ch), true);
curl_close($ch);

if (($resp['code'] ?? 1) === 0) {
    header('Location: ' . $resp['data']['url']);
    exit;
}`,

      callback: `<?php
// Callback Webhook Receiver
header('Content-Type: application/json');
$raw = file_get_contents('php://input');
$event = json_decode($raw, true);

// Record bet/win in your transactions database
// Fast 200 OK
echo json_encode(['code' => 0, 'msg' => 'OK']);`
    },

    python: {
      catalog: `import requests

# 1. Fetch all providers
providers = requests.get('https://yourdomain.com/api/providers').json()
print(f"Total Providers: {len(providers['providers'])}")

# 2. Fetch games for brand 131
games = requests.get('https://yourdomain.com/api/brands/131/games').json()
for g in games.get('games', []):
    print(f"{g['game_name']} -> {g['game_code']}")`,

      launch: `import time, json, base64, requests
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

API_URL = "https://api.allinoneapi.com/launch"
TOKEN = "YOUR_API_TOKEN"
SECRET = b"32_BYTE_SECRET_KEY_HERE_123456" # 32 bytes

def launch_game(user_id=1001, game_uid="8771", balance=100.0):
    payload = {
        "user_id": user_id,
        "balance": balance,
        "game_uid": game_uid,
        "token": TOKEN,
        "timestamp": int(time.time() * 1000),
        "return": "https://yoursite.com/lobby",
        "callback": "https://yoursite.com/webhook",
        "language": "en",
        "currency_code": "INR"
    }

    cipher = AES.new(SECRET, AES.MODE_ECB)
    padded_data = pad(json.dumps(payload).encode('utf-8'), AES.block_size)
    encrypted_payload = base64.b64encode(cipher.encrypt(padded_data)).decode('utf-8')

    req_body = { "token": TOKEN, "payload": encrypted_payload }
    resp = requests.post(API_URL, json=req_body).json()
    if resp.get("code") == 0:
        return resp["data"]["url"]
    raise Exception(resp.get("msg", "Launch failed"))`,

      callback: `from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    event = request.get_json()
    print("AllInOne API Callback Event:", event)
    # Process settlement
    return jsonify({"code": 0, "msg": "OK"}), 200`
    },

    curl: {
      catalog: `# Get All 139 Providers with Logos
curl -X GET "https://yourdomain.com/api/providers"

# Get All Games for Provider 131 (100HP)
curl -X GET "https://yourdomain.com/api/brands/131/games"`,

      launch: `# Launch Game via Encrypted JSON Payload
curl -X POST "https://api.allinoneapi.com/launch" \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "YOUR_API_TOKEN",
    "payload": "BASE64_AES_256_ECB_CIPHERTEXT=="
  }'`,

      callback: `# Simulated Callback Webhook Notification
curl -X POST "https://yourdomain.com/api/webhook" \\
  -H "Content-Type: application/json" \\
  -d '{
    "member_account": "1001",
    "bet_amount": 10.00,
    "win_amount": 25.50,
    "game_uid": "8771",
    "game_round": "RND_871239",
    "notify_only": true,
    "timestamp": 1730166000000
  }'`
    }
  },

  renderCodeSnippets() {
    const snip = this.snippets[this.currentLang] || this.snippets.node;
    const catEl = document.getElementById('codeCatalog');
    const launchEl = document.getElementById('codeLaunch');
    const callbackEl = document.getElementById('codeCallback');

    if (catEl) catEl.textContent = snip.catalog;
    if (launchEl) launchEl.textContent = snip.launch;
    if (callbackEl) callbackEl.textContent = snip.callback;
  },

  copyCode(id) {
    const el = document.getElementById(id);
    if (!el) return;
    navigator.clipboard.writeText(el.textContent).then(() => {
      App.showToast('Code copied to clipboard!', 'success');
    });
  },

  async runEncryptionTest() {
    const token = document.getElementById('encToken').value.trim();
    const secret = document.getElementById('encSecret').value.trim();
    const userId = parseInt(document.getElementById('encUserId').value.trim() || '1001');
    const balance = parseFloat(document.getElementById('encBalance').value.trim() || '100.00');
    const gameUid = document.getElementById('encGameUid').value.trim() || '8771';
    const currency = document.getElementById('encCurrency').value.trim() || 'INR';
    const outputEl = document.getElementById('encOutput');

    if (secret.length !== 32) {
      alert('Secret Key must be exactly 32 characters (AES-256 requirement).');
      return;
    }

    outputEl.textContent = 'Encrypting via AES-256-ECB PKCS7...';

    try {
      const res = await fetch('/api/encrypt-payload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          secret,
          payload: {
            user_id: userId,
            balance: balance,
            game_uid: gameUid,
            token: token,
            timestamp: Date.now(),
            return: 'https://yoursite.com/lobby',
            callback: 'https://yoursite.com/api/webhook',
            language: 'en',
            currency_code: currency
          }
        })
      });

      const data = await res.json();
      outputEl.textContent = JSON.stringify(data, null, 2);
      App.showToast('Payload encrypted successfully!', 'success');
    } catch (e) {
      outputEl.textContent = 'Error: ' + e.message;
    }
  },

  async runWebhookTest() {
    const outputEl = document.getElementById('webhookTestOutput');
    outputEl.textContent = 'Sending simulated bet/win webhook event...';

    const sampleEvent = {
      game_id: 131,
      game_uid: "8771",
      game_name: "Air Jet Crash",
      game_round: "RND_" + Math.floor(Math.random() * 899999 + 100000),
      member_account: "1001",
      bet_amount: 10.00,
      win_amount: 28.50,
      timestamp: Date.now(),
      notify_only: true
    };

    try {
      const res = await fetch('/api/softapi/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleEvent)
      });
      const data = await res.json();
      outputEl.textContent = `Event Sent:\n${JSON.stringify(sampleEvent, null, 2)}\n\nServer Response:\n${JSON.stringify(data, null, 2)}`;
      App.showToast('Webhook event dispatched and verified!', 'success');
    } catch (e) {
      outputEl.textContent = 'Error: ' + e.message;
    }
  }
};
