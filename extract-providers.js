const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--host-resolver-rules=MAP www.betway.co.za 104.18.43.32, MAP *.betwayafrica.com 104.18.43.32, MAP *.betway.co.za 104.18.43.32',
      '--ignore-certificate-errors']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  // Capture game launch API calls
  const launchAPIs = [];
  page.on('response', async (res) => {
    const url = res.url();
    const ct = res.headers()['content-type'] || '';
    if (ct.includes('json') && (url.includes('/Gaming/Game/') || url.includes('/Gaming/launch'))) {
      try {
        const body = await res.json();
        launchAPIs.push({ url, method: res.request().method(), status: res.status(), body });
      } catch (e) {}
    }
  });

  try {
    // Login
    console.log('[1] Login...');
    await page.goto('https://www.betway.co.za', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    const mobile = await page.$('input[placeholder*="Mobile" i]');
    if (mobile) await mobile.fill('222212222');
    const pass = await page.$('input[type="password"]');
    if (pass) await pass.fill('1234567890');
    await page.waitForTimeout(500);
    try { await page.click('button:has-text("Login")', { timeout: 5000 }); } catch(e) {}
    await page.waitForTimeout(6000);
    // Handle Continue/Got it
    try { await page.click('button:has-text("Got it")', { timeout: 3000 }); } catch(e) {}
    await page.waitForTimeout(3000);
    console.log('  Logged in');

    // Fetch categories API directly to get all providers
    console.log('\n[2] Fetching game categories API...');
    const categoriesResp = await page.evaluate(async () => {
      const resp = await fetch('https://casinoapic.betwayafrica.com/api/v4/Gaming/Game/Categories?channel=WebDesktop&count=100&gameCount=100&languageCode=en-US&currency=ZAR&environment=Production&regionCode=ZA&vertical=casino-games');
      return await resp.json();
    });

    // Extract all games with providers
    const allGames = [];
    const providerMap = {};

    if (categoriesResp && categoriesResp.categories) {
      categoriesResp.categories.forEach(cat => {
        if (cat.games) {
          cat.games.forEach(game => {
            if (game.provider && !allGames.find(g => g.alias === game.alias)) {
              allGames.push({
                id: game.id,
                name: game.name,
                alias: game.alias,
                provider: game.provider,
                gameType: game.gameType,
                launchParams: game.launchParamaters,
                likes: game.likesCount
              });
              if (!providerMap[game.provider]) providerMap[game.provider] = [];
              providerMap[game.provider].push({
                name: game.name,
                alias: game.alias,
                likes: game.likesCount,
                gameType: game.gameType
              });
            }
          });
        }
      });
    }

    console.log('\n========= ALL PROVIDERS =========');
    const providers = Object.keys(providerMap).sort((a, b) => providerMap[b].length - providerMap[a].length);
    providers.forEach((p, i) => {
      const games = providerMap[p];
      const topGame = games.sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
      console.log(`${i+1}. ${p} (${games.length} games) - Top: ${topGame.name} [${topGame.alias}] (${topGame.likes} likes)`);
    });

    // Also fetch personalised/mostLiked to get more provider data
    console.log('\n[3] Fetching personalised games...');
    const personalResp = await page.evaluate(async () => {
      const resp = await fetch('https://casinoapi.betwayafrica.com/api/v3/Gaming/Game/Personalised/?region=ZA&channel=WebDesktop&languageCode=en-US&vertical=casino-games&currency=ZAR&includeLikedGames=true');
      return await resp.json();
    });

    if (personalResp && personalResp.mostLiked) {
      personalResp.mostLiked.forEach(game => {
        if (game.provider && !providerMap[game.provider]) providerMap[game.provider] = [];
        if (game.provider && !providerMap[game.provider].find(g => g.alias === game.alias)) {
          providerMap[game.provider].push({
            name: game.name,
            alias: game.alias,
            likes: game.likesCount,
            gameType: game.gameType
          });
        }
      });
    }

    // Pick top 10 providers with their best game
    console.log('\n\n========= TOP 10 PROVIDERS WITH BEST GAME =========');
    const top10 = Object.entries(providerMap)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);

    const gameLaunchTargets = [];
    for (const [provider, games] of top10) {
      const best = games.sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
      gameLaunchTargets.push({ provider, game: best.name, alias: best.alias, likes: best.likes, type: best.gameType });
      console.log(`${provider}: ${best.name} (${best.alias}) - ${best.likes} likes - ${best.gameType}`);
    }

    // STEP 4: Launch each game to capture the launch API
    console.log('\n\n========= LAUNCHING TOP 10 GAMES =========');
    for (const target of gameLaunchTargets) {
      console.log(`\n--- Launching: ${target.game} (${target.provider}) ---`);
      launchAPIs.length = 0; // Reset

      try {
        await page.goto(
          `https://www.betway.co.za/lobby/casino-games/game/${target.alias}?vertical=casino-games`,
          { waitUntil: 'domcontentloaded', timeout: 30000 }
        );
        await page.waitForTimeout(8000);

        // Click Play/Continue if present
        const btns = await page.$$('button:visible');
        for (const b of btns) {
          const t = (await b.textContent().catch(()=>'')).trim().toLowerCase();
          if (t.includes('play') || t.includes('continue') || t.includes('launch')) {
            await b.click();
            await page.waitForTimeout(5000);
            break;
          }
        }

        // Print captured launch API for this game
        const launchCall = launchAPIs.find(a => a.url.includes('/Gaming/launch'));
        const detailCall = launchAPIs.find(a => a.url.includes('/Gaming/Game/') && a.url.includes('/alias'));

        if (detailCall) {
          console.log(`  Game Details API: ${detailCall.url.slice(0, 150)}`);
          console.log(`  Provider: ${detailCall.body.provider}`);
          console.log(`  Launch Params: ${JSON.stringify(detailCall.body.launchParamaters)}`);
        }
        if (launchCall) {
          console.log(`  Launch API: ${launchCall.url}`);
          console.log(`  Launch Method: ${launchCall.method}`);
          console.log(`  iframeUrl: ${launchCall.body.iframeUrl?.slice(0, 150)}`);
          target.launchUrl = launchCall.url;
          target.iframeUrl = launchCall.body.iframeUrl;
        } else {
          console.log('  No launch API captured (may need login or game may be restricted)');
        }
      } catch (e) {
        console.log(`  Error: ${e.message.slice(0, 100)}`);
      }
    }

    // Final summary
    console.log('\n\n========= LOAD TEST TARGET SUMMARY =========');
    console.log(JSON.stringify(gameLaunchTargets, null, 2));

  } catch (err) {
    console.error('FATAL:', err.message);
  }

  await browser.close();
  console.log('\nDone.');
})();
