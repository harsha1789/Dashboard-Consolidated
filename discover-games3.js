.0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           const { chromium } = require('playwright');

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

  const allAPIs = [];
  const jsonResponses = [];

  // Capture ALL network requests
  page.on('response', async (res) => {
    const url = res.url();
    const ct = res.headers()['content-type'] || '';
    if (ct.includes('json') && !url.includes('/_nuxt/') && !url.endsWith('.js')) {
      try {
        const body = await res.json();
        const bodyStr = JSON.stringify(body);
        allAPIs.push({ method: res.request().method(), url, status: res.status() });
        // Keep responses that might contain game/provider data
        if (bodyStr.length > 50) {
          jsonResponses.push({ method: res.request().method(), url, status: res.status(), body, bodyStr });
        }
      } catch (e) {}
    }
  });

  try {
    // ====== STEP 1: Load homepage ======
    console.log('[1] Loading Betway ZA homepage...');
    await page.goto('https://www.betway.co.za', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    console.log('  Loaded:', await page.title());

    // ====== STEP 2: Login - fill credentials ======
    console.log('[2] Filling login credentials...');
    // Fill mobile number
    const mobileInput = await page.$('input[placeholder*="Mobile" i]');
    if (mobileInput) {
      await mobileInput.fill('222212222');
      console.log('  Filled mobile number');
    }
    // Fill password
    const passInput = await page.$('input[type="password"]');
    if (passInput) {
      await passInput.fill('1234567890');
      console.log('  Filled password');
    }
    await page.waitForTimeout(1000);

    // Click Login button
    const loginBtn = await page.$('button:has-text("Login")');
    if (loginBtn) {
      await loginBtn.click();
      console.log('  Clicked Login button');
    }
    await page.waitForTimeout(5000);

    // ====== STEP 3: Handle Continue button ======
    console.log('[3] Looking for Continue button...');
    // Try multiple selectors for the Continue button
    const continueSelectors = [
      'button:has-text("Continue")',
      'button:has-text("continue")',
      'a:has-text("Continue")',
      'button:has-text("Proceed")',
      'button:has-text("OK")',
      'button:has-text("Accept")',
      '[class*="continue" i]',
      '[class*="proceed" i]'
    ];
    let continuedClicked = false;
    for (const sel of continueSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn && await btn.isVisible()) {
          await btn.click();
          console.log('  Clicked Continue via:', sel);
          continuedClicked = true;
          break;
        }
      } catch (e) {}
    }
    if (!continuedClicked) {
      // Try clicking any visible button that might be Continue
      const allBtns = await page.$$('button:visible');
      for (const btn of allBtns) {
        const txt = (await btn.textContent().catch(() => '')).trim();
        console.log('  Visible button:', txt);
        if (txt.toLowerCase().includes('continu') || txt.toLowerCase().includes('proceed') || txt.toLowerCase().includes('ok')) {
          await btn.click();
          console.log('  Clicked:', txt);
          continuedClicked = true;
          break;
        }
      }
    }
    await page.waitForTimeout(8000);
    console.log('  Current URL after login:', page.url());

    // Screenshot after login
    await page.screenshot({ path: 'C:\\Users\\HT67091\\Downloads\\Automation-Dashboard-main\\after-login.png', fullPage: false });
    console.log('  Screenshot: after-login.png');

    // ====== STEP 4: Navigate to Casino Lobby ======
    console.log('[4] Navigating to Casino Games lobby...');
    await page.goto('https://www.betway.co.za/lobby/casino-games', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(12000);

    // Scroll extensively to load all games
    console.log('[5] Scrolling to load games...');
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: 'C:\\Users\\HT67091\\Downloads\\Automation-Dashboard-main\\casino-lobby.png', fullPage: false });
    console.log('  Screenshot: casino-lobby.png');

    // ====== STEP 6: Extract game links and info ======
    console.log('[6] Extracting game data from page...');
    const pageData = await page.evaluate(() => {
      const results = {
        gameLinks: [],
        allText: document.body.innerText.slice(0, 5000),
        categories: [],
        providers: []
      };

      // Find all game links
      document.querySelectorAll('a[href*="/game/"]').forEach(a => {
        const href = a.getAttribute('href') || '';
        const text = a.textContent.trim().slice(0, 100);
        const img = a.querySelector('img');
        const alt = img ? img.getAttribute('alt') || '' : '';
        const src = img ? (img.getAttribute('src') || '').slice(0, 150) : '';
        results.gameLinks.push({ href, text, alt, imgSrc: src });
      });

      // Find category/filter/provider elements
      document.querySelectorAll('[class*="category" i], [class*="filter" i], [class*="tab" i], [class*="provider" i]').forEach(el => {
        const text = el.textContent.trim().slice(0, 100);
        const cls = el.className.toString().slice(0, 80);
        if (text && text.length < 50) results.categories.push({ text, class: cls });
      });

      // Find data attributes
      document.querySelectorAll('[data-provider], [data-vendor], [data-studio]').forEach(el => {
        results.providers.push({
          provider: el.getAttribute('data-provider') || '',
          vendor: el.getAttribute('data-vendor') || '',
          studio: el.getAttribute('data-studio') || ''
        });
      });

      return results;
    });

    console.log('\nPage text:\n', pageData.allText.slice(0, 2000));
    console.log('\nGame links found:', pageData.gameLinks.length);
    pageData.gameLinks.forEach((g, i) => console.log(`  [${i+1}] ${g.alt || g.text} -> ${g.href}`));
    console.log('\nCategories/filters:', pageData.categories.length);
    pageData.categories.slice(0, 20).forEach(c => console.log(`  ${c.text}`));
    console.log('\nData-provider elements:', pageData.providers.length);
    pageData.providers.forEach(p => console.log(`  ${JSON.stringify(p)}`));

    // ====== STEP 7: Try launching a known game to capture launch API ======
    console.log('\n[7] Launching Roman Empire game to capture launch API...');
    await page.goto('https://www.betway.co.za/lobby/casino-games/game/roman-empire?vertical=casino-games', {
      waitUntil: 'domcontentloaded', timeout: 60000
    });
    await page.waitForTimeout(10000);
    console.log('  URL:', page.url());

    // Handle any Continue/Play button on game page
    const playBtns = await page.$$('button:visible');
    for (const btn of playBtns) {
      const txt = (await btn.textContent().catch(() => '')).trim();
      if (txt.toLowerCase().includes('play') || txt.toLowerCase().includes('continue') || txt.toLowerCase().includes('launch') || txt.toLowerCase().includes('start')) {
        console.log('  Clicking game button:', txt);
        await btn.click();
        await page.waitForTimeout(8000);
        break;
      }
    }

    await page.screenshot({ path: 'C:\\Users\\HT67091\\Downloads\\Automation-Dashboard-main\\game-launch.png', fullPage: false });
    console.log('  Screenshot: game-launch.png');
    console.log('  Final URL:', page.url());

    // ====== STEP 8: Also try other known games ======
    const knownGames = [
      'aviator', 'sweet-bonanza', 'starburst', 'gates-of-olympus',
      'sugar-rush', 'big-bass-bonanza', 'wolf-gold', 'book-of-dead',
      'gonzos-quest', 'mega-moolah', 'immortal-romance', 'lightning-roulette'
    ];
    console.log('\n[8] Testing known game slugs...');
    for (const game of knownGames) {
      try {
        const resp = await page.goto(
          `https://www.betway.co.za/lobby/casino-games/game/${game}?vertical=casino-games`,
          { waitUntil: 'domcontentloaded', timeout: 20000 }
        );
        await page.waitForTimeout(5000);
        const text = await page.evaluate(() => document.body.innerText.slice(0, 300));
        const is404 = text.includes("can't seem to find") || text.includes('not found');
        console.log(`  ${game}: ${is404 ? '404' : 'FOUND'} [${resp.status()}]`);
      } catch (e) {
        console.log(`  ${game}: ERROR - ${e.message.slice(0, 60)}`);
      }
    }

  } catch (err) {
    console.error('FATAL:', err.message);
  }

  // ====== PRINT ALL CAPTURED APIs ======
  console.log('\n\n========= ALL JSON APIs CAPTURED =========');
  console.log('Total:', allAPIs.length);
  allAPIs.forEach((api, i) => {
    console.log(`[${i+1}] ${api.method} [${api.status}] ${api.url.slice(0, 250)}`);
  });

  console.log('\n\n========= GAME/PROVIDER RELEVANT RESPONSES =========');
  jsonResponses.forEach((r, i) => {
    const s = r.bodyStr.toLowerCase();
    if (s.includes('game') || s.includes('provider') || s.includes('launch') || s.includes('casino') || s.includes('slot') || s.includes('lobby')) {
      console.log(`\n--- [${i+1}] ${r.method} [${r.status}] ${r.url.slice(0, 200)} ---`);
      console.log(r.bodyStr.slice(0, 1500));
    }
  });

  await browser.close();
  console.log('\nDone.');
})();
