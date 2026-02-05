const path = require('path');
const fs = require('fs');

// Try to use playwright from node_modules or from automation directory
let chromium;
try {
    chromium = require('playwright').chromium;
} catch (e) {
    // Fallback to a relative path if playwright is installed elsewhere
    try {
        chromium = require(path.resolve(__dirname, '../../Betway-Automation/node_modules/playwright')).chromium;
    } catch (e2) {
        console.error('Playwright not found. Please install it with: npm install playwright');
        process.exit(1);
    }
}

(async () => {
    const reportUrl = process.argv[2];
    const outputPath = process.argv[3];

    if (!reportUrl || !outputPath) {
        console.error('Usage: node functional-print-pdf.js <url> <output-path>');
        process.exit(1);
    }

    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();

        console.log(`[Functional PDF] Navigating to ${reportUrl}...`);
        await page.goto(reportUrl, { waitUntil: 'networkidle' });

        // Expand failed tests if any
        try {
            const failedHeaders = await page.locator('.test-card.failed .card-header').all();
            for (const header of failedHeaders) {
                await header.click();
            }
            await page.waitForTimeout(1000);
        } catch (e) {
            console.log('[Functional PDF] Error expanding failed tests:', e.message);
        }

        console.log('[Functional PDF] Generating PDF...');
        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                bottom: '20px',
                left: '20px',
                right: '20px'
            }
        });

        await browser.close();
        console.log('[Functional PDF] PDF generated successfully.');
        process.exit(0);

    } catch (error) {
        console.error('[Functional PDF] Generation Error:', error);
        process.exit(1);
    }
})();
