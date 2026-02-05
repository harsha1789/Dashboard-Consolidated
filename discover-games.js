const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  const capturedAPIs = [];
  const gameResponses = [];

  // Intercept ALL network responses with JSON
  page.on('response', async (res) => {
    const url = res.url();
    const urlLower = url.toLowerCase();
    const isRelevant = urlLower.includes('casino') || urlLower.includes('game') ||
      urlLower.includes('launch') || urlLower.includes('lobby') ||
      urlLower.includes('provider') || urlLower.includes('slot') ||
      urlLower.includes('categor') || urlLower.includes('play') ||
      urlLower.includes('session') || urlLower.includes('token') ||
      urlLower.includes('login') || urlLower.includes('auth');

    if (isRelevant) {
      capturedAPIs.push({ method: res.request().method(), url, status: res.status() });
      const ct = res.headers()['content-type'] || '';
      if (ct.includes('json')) {
        try {
          const body = await res.json();
          gameResponses.push({ url, status: res.status(), body });
        } catch (e) {}
      }
    }
  });

  try {
    // Step 1: Load Betway
    console.log('[1] Loading Betway ZA...');
    await page.goto('https://www.betway.co.za', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000);
    console.log('  Page loaded:', await page.title());

    // Step 2: Login
    console.log('[2] Attempting login...');
    // Click login button
    try {
      const loginBtns = await page.$$('button, a');
      for (const btn of loginBtns) {
        const txt = await btn.textContent().catch(() => '');
        if (txt.toLowerCase().includes('log in') || txt.toLowerCase().includes('login') || txt.toLowerCase().includes('sign in')) {
          console.log('  Clicking:', txt.trim());
          await btn.click();
          await page.waitForTimeout(3000);
          break;
        }
      }
    } catch (e) {
      console.log('  Login button search error:', e.message.slice(0, 100));
    }

    // Fill credentials
    await page.waitForTimeout(2000);
    const allInputs = await page.$$('input');
    console.log('  Found', allInputs.length, 'input fields');
    for (const inp of allInputs) {
      const type = await inp.getAttribute('type').catch(() => '');
      const name = await inp.getAttribute('name').catch(() => '');
      const ph = await inp.getAttribute('placeholder').catch(() => '');
      const vis = await inp.isVisible().catch(() => false);
      if (vis) console.log('  Visible input:', { type, name, placeholder: ph });
    }

    // Try filling mobile/phone input
    const phoneSelectors = [
      'input[type="tel"]', 'input[name="mobile"]', 'input[name="msisdn"]',
      'input[name="username"]', 'input[name="phone"]', 'input[name="phoneNumber"]',
      'input[placeholder*="mobile" i]', 'input[placeholder*="phone" i]',
      'input[placeholder*="number" i]', 'input[placeholder*="cell" i]'
    ];
    let phoneFilled = false;
    for (const sel of phoneSelectors) {
      const el = await page.$(sel);
      if (el && await el.isVisible().catch(() => false)) {
        await el.fill('222212222');
        phoneFilled = true;
        console.log('  Filled phone via:', sel);
        break;
      }
    }
    // If no specific phone input, try first visible text/tel input
    if (!phoneFilled) {
      for (const inp of allInputs) {
        const type = await inp.getAttribute('type').catch(() => '');
        const vis = await inp.isVisible().catch(() => false);
        if (vis && (type === 'tel' || type === 'text' || type === 'number' || type === '')) {
          await inp.fill('222212222');
          phoneFilled = true;
          console.log('  Filled phone via first visible input');
          break;
        }
      }
    }

    // Fill password
    const passInput = await page.$('input[type="password"]:visible');
    if (passInput) {
      await passInput.fill('1234567890');
      console.log('  Filled password');
    }

    // Submit
    await page.waitForTimeout(1000);
    const submitBtns = await page.$$('button[type="submit"], button');
    for (const btn of submitBtns) {
      const txt = await btn.textContent().catch(() => '');
      const vis = await btn.isVisible().catch(() => false);
      if (vis && (txt.toLowerCase().includes('log in') || txt.toLowerCase().includes('login') || txt.toLowerCase().includes('sign in') || txt.toLowerCase().includes('submit'))) {
        console.log('  Submitting via:', txt.trim());
        await btn.click();
        break;
      }
    }
    console.log('  Waiting for login response...');
    await page.waitForTimeout(10000);
    console.log('  Current URL:', page.url());

    // Step 3: Navigate to Casino
    console.log('[3] Navigating to Casino...');
    await page.goto('https://www.betway.co.za/casino', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(10000);
    console.log('  Casino page loaded');

    // Step 4: Scroll to load games
    console.log('[4] Scrolling to discover games...');
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(2000);
    }

    // Step 5: Screenshot
    await page.screenshot({
      path: 'C:\\Users\\HT67091\\Downloads\\Automation-Dashboard-main\\betway-casino.png',
      fullPage: false
    });
    console.log('[5] Screenshot saved to betway-casino.png');

    // Step 6: Get page content
    console.log('[6] Extracting page content...');
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Page text (first 2000 chars):\n', bodyText.slice(0, 2000));

    // Step 7: Find clickable game elements
    console.log('\n[7] Finding game elements...');
    const gameInfo = await page.evaluate(() => {
      const results = [];
      // Look for game images, cards, tiles
      const elements = document.querySelectorAll('img[alt], [class*="game"], [data-game], [data-provider]');
      elements.forEach((el) => {
        const alt = el.getAttribute('alt') || '';
        const src = el.getAttribute('src') || '';
        const cls = el.className || '';
        const dataGame = el.getAttribute('data-game') || '';
        const dataProv = el.getAttribute('data-provider') || '';
        const href = el.closest('a')?.getAttribute('href') || '';
        if (alt || dataGame || dataProv || href.includes('game') || href.includes('casino')) {
          results.push({ alt, src: src.slice(0, 100), class: cls.toString().slice(0, 80), dataGame, dataProv, href: href.slice(0, 150) });
        }
      });
      return results.slice(0, 50);
    });
    console.log('Game elements found:', gameInfo.length);
    gameInfo.forEach((g, i) => console.log(`  [${i+1}]`, JSON.stringify(g)));

    // Step 8: Try clicking a game to capture launch API
    if (gameInfo.length > 0) {
      console.log('\n[8] Attempting to click games to capture launch APIs...');
      const clickableGames = await page.$$('[data-game], [class*="game"] img, a[href*="casino/game"], a[href*="casino/play"]');
      for (let i = 0; i < Math.min(3, clickableGames.length); i++) {
        try {
          console.log('  Clicking game', i + 1);
          await clickableGames[i].click();
          await page.waitForTimeout(6000);
          console.log('  URL after click:', page.url());
          await page.screenshot({
            path: `C:\\Users\\HT67091\\Downloads\\Automation-Dashboard-main\\game-launch-${i+1}.png`,
            fullPage: false
          });
          await page.goBack({ waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(4000);
        } catch (e) {
          console.log('  Click error:', e.message.slice(0, 100));
        }
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
  }

  // Print results
  console.log('\n\n========= ALL CAPTURED APIs =========');
  console.log('Total:', capturedAPIs.length);
  capturedAPIs.forEach((api, i) => {
    console.log(`[${i+1}] ${api.method} [${api.status}] ${api.url.slice(0, 200)}`);
  });

  console.log('\n\n========= JSON RESPONSES WITH GAME/PROVIDER DATA =========');
  console.log('Total JSON responses:', gameResponses.length);
  gameResponses.forEach((r, i) => {
    console.log(`\n--- Response ${i+1}: ${r.url.slice(0, 150)} [${r.status}] ---`);
    const str = JSON.stringify(r.body);
    // Look for provider/game related keys
    if (str.toLowerCase().includes('provider') || str.toLowerCase().includes('game') || str.toLowerCase().includes('launch') || str.toLowerCase().includes('slot')) {
      console.log('RELEVANT:', str.slice(0, 1000));
    } else {
      console.log('Preview:', str.slice(0, 300));
    }
  });

  await browser.close();
  console.log('\nDone.');
})();
