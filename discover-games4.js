const { chromium } = require('playwright');

(async () => {
  // Force DNS resolution for betway domains using known IPs
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--host-resolver-rules=MAP www.betway.co.za 104.18.43.32, MAP *.betwayafrica.com 104.18.43.32, MAP *.betway.co.za 104.18.43.32',
      '--ignore-certificate-errors'
    ]
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  const allAPIs = [];
  const jsonResponses = [];

  page.on('response', async (res) => {
    const url = res.url();
    const ct = res.headers()['content-type'] || '';
    if (ct.includes('json') && !url.includes('/_nuxt/') && !url.endsWith('.js')) {
      try {
        const body = await res.json();
        const bodyStr = JSON.stringify(body);
        allAPIs.push({ method: res.request().method(), url, status: res.status() });
        if (bodyStr.length > 50) {
          jsonResponses.push({ method: res.request().method(), url, status: res.status(), bodyStr });
        }
      } catch (e) {}
    }
  });

  try {
    // STEP 1: Load homepage
    console.log('[1] Loading Betway ZA...');
    await page.goto('https://www.betway.co.za', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000);
    console.log('  Loaded:', await page.title());

    // STEP 2: Login
    console.log('[2] Logging in...');
    const mobile = await page.$('input[placeholder*="Mobile" i]');
    if (mobile) { await mobile.fill('222212222'); console.log('  Mobile filled'); }
    const pass = await page.$('input[type="password"]');
    if (pass) { await pass.fill('1234567890'); console.log('  Password filled'); }
    await page.waitForTimeout(500);

    // Click Login
    try {
      await page.click('button:has-text("Login")', { timeout: 5000 });
      console.log('  Login clicked');
    } catch (e) {
      console.log('  Login btn not found, trying alternatives...');
      const btns = await page.$$('button:visible');
      for (const b of btns) {
        const t = (await b.textContent().catch(()=>'')).trim().toLowerCase();
        if (t.includes('log in') || t === 'login') { await b.click(); console.log('  Clicked:', t); break; }
      }
    }
    await page.waitForTimeout(6000);

    // STEP 3: Continue button
    console.log('[3] Handling Continue...');
    await page.screenshot({ path: 'C:\\Users\\HT67091\\Downloads\\Automation-Dashboard-main\\step3-before-continue.png' });

    // Dump all visible buttons for debugging
    const visBtns = await page.$$('button:visible');
    for (const b of visBtns) {
      const t = (await b.textContent().catch(()=>'')).trim();
      if (t) console.log('  Button:', t);
    }

    // Try Continue
    try {
      await page.click('button:has-text("Continue")', { timeout: 5000 });
      console.log('  Continue clicked');
    } catch (e) {
      console.log('  No Continue button found');
      // Try any modal/dialog buttons
      try {
        await page.click('button:has-text("OK")', { timeout: 3000 });
        console.log('  OK clicked');
      } catch(e2) {}
      try {
        await page.click('button:has-text("Accept")', { timeout: 3000 });
        console.log('  Accept clicked');
      } catch(e2) {}
      try {
        await page.click('button:has-text("Close")', { timeout: 3000 });
        console.log('  Close clicked');
      } catch(e2) {}
    }
    await page.waitForTimeout(8000);
    console.log('  URL:', page.url());
    await page.screenshot({ path: 'C:\\Users\\HT67091\\Downloads\\Automation-Dashboard-main\\step3-after-continue.png' });

    // Check if logged in by looking for account/balance indicators
    const pageText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('  Page snippet:', pageText.slice(0, 200));

    // STEP 4: Navigate to casino lobby
    console.log('[4] Going to casino lobby...');
    await page.goto('https://www.betway.co.za/lobby/casino-games', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(15000);

    // Scroll to load games
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: 'C:\\Users\\HT67091\\Downloads\\Automation-Dashboard-main\\casino-lobby-full.png' });
    console.log('  Casino lobby screenshot saved');

    // Extract games
    const gameData = await page.evaluate(() => {
      const games = [];
      // Try multiple selector strategies
      document.querySelectorAll('a[href*="/game/"]').forEach(a => {
        const href = a.getAttribute('href') || '';
        const img = a.querySelector('img');
        games.push({
          href,
          text: a.textContent.trim().slice(0, 80),
          alt: img ? img.getAttribute('alt') || '' : '',
          src: img ? (img.getAttribute('src') || '').slice(0, 150) : ''
        });
      });
      // Also try link-style game elements
      document.querySelectorAll('[href*="casino-games"]').forEach(el => {
        const href = el.getAttribute('href') || '';
        if (href.includes('/game/')) {
          games.push({
            href,
            text: el.textContent.trim().slice(0, 80),
            alt: '',
            src: ''
          });
        }
      });
      return games;
    });

    console.log('\nGames found:', gameData.length);
    // Deduplicate by href
    const seen = new Set();
    const uniqueGames = gameData.filter(g => { if (seen.has(g.href)) return false; seen.add(g.href); return true; });
    console.log('Unique games:', uniqueGames.length);
    uniqueGames.forEach((g, i) => console.log(`  [${i+1}] ${g.alt || g.text || 'Unknown'} -> ${g.href}`));

    // STEP 5: Get page categories/text
    const lobbyText = await page.evaluate(() => document.body.innerText);
    console.log('\nLobby text (3000 chars):\n', lobbyText.slice(0, 3000));

    // STEP 6: Launch the confirmed working game
    console.log('\n[6] Launching Roman Empire...');
    await page.goto('https://www.betway.co.za/lobby/casino-games/game/roman-empire?vertical=casino-games', {
      waitUntil: 'domcontentloaded', timeout: 60000
    });
    await page.waitForTimeout(10000);

    // Look for Play/Continue button on game page
    const gameBtns = await page.$$('button:visible');
    for (const b of gameBtns) {
      const t = (await b.textContent().catch(()=>'')).trim();
      if (t) console.log('  Game page button:', t);
      if (t.toLowerCase().includes('play') || t.toLowerCase().includes('continue') || t.toLowerCase().includes('launch')) {
        await b.click();
        console.log('  Clicked:', t);
        await page.waitForTimeout(10000);
        break;
      }
    }
    console.log('  Game URL:', page.url());
    await page.screenshot({ path: 'C:\\Users\\HT67091\\Downloads\\Automation-Dashboard-main\\roman-empire-game.png' });

  } catch (err) {
    console.error('FATAL:', err.message);
    await page.screenshot({ path: 'C:\\Users\\HT67091\\Downloads\\Automation-Dashboard-main\\error-screenshot.png' }).catch(()=>{});
  }

  // Print captured APIs
  console.log('\n\n========= ALL JSON APIs =========');
  console.log('Total:', allAPIs.length);
  allAPIs.forEach((api, i) => {
    console.log(`[${i+1}] ${api.method} [${api.status}] ${api.url.slice(0, 250)}`);
  });

  console.log('\n\n========= RELEVANT JSON RESPONSES =========');
  jsonResponses.forEach((r, i) => {
    const s = r.bodyStr.toLowerCase();
    if (s.includes('game') || s.includes('provider') || s.includes('launch') || s.includes('casino') ||
        s.includes('slot') || s.includes('lobby') || s.includes('roman')) {
      console.log(`\n--- [${i+1}] ${r.method} [${r.status}] ${r.url.slice(0, 200)} ---`);
      console.log(r.bodyStr.slice(0, 2000));
    }
  });

  await browser.close();
  console.log('\nDone.');
})();
