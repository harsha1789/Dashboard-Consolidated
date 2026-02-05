const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-web-security','--disable-features=IsolateOrigins,site-per-process']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  const capturedAPIs = [];

  page.on('response', async (res) => {
    const url = res.url();
    const ct = res.headers()['content-type'] || '';
    // Capture ALL JSON API responses (not static assets)
    if (ct.includes('json') && !url.includes('/_nuxt/') && !url.includes('.js')) {
      try {
        const body = await res.json();
        capturedAPIs.push({
          method: res.request().method(),
          url: url,
          status: res.status(),
          bodyPreview: JSON.stringify(body).slice(0, 2000)
        });
      } catch (e) {}
    }
  });

  try {
    // Go directly to casino lobby
    console.log('[1] Loading Casino Lobby...');
    await page.goto('https://www.betway.co.za/lobby/casino-games', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(12000);
    console.log('  Title:', await page.title());
    console.log('  URL:', page.url());

    // Scroll to load games
    console.log('[2] Scrolling...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(1500);
    }

    // Screenshot
    await page.screenshot({ path: 'C:\\Users\\HT67091\\Downloads\\Automation-Dashboard-main\\casino-lobby.png', fullPage: false });
    console.log('[3] Screenshot saved');

    // Extract page text
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('[4] Page text:\n', bodyText.slice(0, 3000));

    // Find ALL links and game-related elements
    console.log('\n[5] Extracting all game/lobby links...');
    const links = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href') || '';
        const text = a.textContent.trim().slice(0, 80);
        if (href.includes('lobby') || href.includes('game') || href.includes('casino') || href.includes('play')) {
          results.push({ href, text });
        }
      });
      return results;
    });
    console.log('Game/lobby links:', links.length);
    links.forEach((l, i) => console.log(`  [${i+1}] ${l.text} -> ${l.href}`));

    // Now try sub-lobbies to find providers
    const subLobbies = [
      '/lobby/casino-games/slots',
      '/lobby/casino-games/table-games',
      '/lobby/casino-games/live-casino',
      '/lobby/casino-games/jackpots',
      '/lobby/casino-games/new-games',
      '/lobby/casino-games/popular',
    ];

    for (const lobby of subLobbies) {
      console.log(`\n[6] Trying sub-lobby: ${lobby}`);
      try {
        await page.goto('https://www.betway.co.za' + lobby, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(8000);
        const text = await page.evaluate(() => document.body.innerText);
        if (!text.includes("can't seem to find")) {
          console.log('  FOUND! Content:', text.slice(0, 500));
          // Find game tiles
          const games = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('a[href*="game/"]').forEach(a => {
              items.push({ href: a.getAttribute('href'), text: a.textContent.trim().slice(0, 50) });
            });
            return items.slice(0, 20);
          });
          console.log('  Games found:', games.length);
          games.forEach(g => console.log('    ', g.text, '->', g.href));
        } else {
          console.log('  404 page');
        }
      } catch (e) {
        console.log('  Error:', e.message.slice(0, 80));
      }
    }

    // Try the Aviator game direct link we found
    console.log('\n[7] Trying Aviator game launch...');
    await page.goto('https://www.betway.co.za/lobby/casino-games/game/aviator', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);
    const aviText = await page.evaluate(() => document.body.innerText);
    console.log('Aviator page:', aviText.slice(0, 500));
    await page.screenshot({ path: 'C:\\Users\\HT67091\\Downloads\\Automation-Dashboard-main\\aviator-game.png', fullPage: false });

  } catch (err) {
    console.error('Error:', err.message);
  }

  // Print all captured JSON APIs
  console.log('\n\n========= ALL JSON API RESPONSES =========');
  console.log('Total:', capturedAPIs.length);
  capturedAPIs.forEach((api, i) => {
    console.log(`\n[${i+1}] ${api.method} [${api.status}] ${api.url.slice(0, 200)}`);
    console.log('Body:', api.bodyPreview.slice(0, 500));
  });

  await browser.close();
  console.log('\nDone.');
})();
