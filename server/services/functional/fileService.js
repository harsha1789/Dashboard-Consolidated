const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function generatePdfReport(req, res, port) {
    const reportUrl = `http://localhost:${port}/functional-report/index.html`;
    const scriptPath = path.resolve(__dirname, '../../functional-print-pdf.js');
    const safeOutputPath = path.resolve(__dirname, `../../functional-report-${Date.now()}.pdf`);

    const child = spawn('node', [scriptPath, reportUrl, safeOutputPath], {
        cwd: path.resolve(__dirname, '../..')
    });

    child.stdout.on('data', (data) => console.log(`[Functional PDF]: ${data}`));
    child.stderr.on('data', (data) => console.error(`[Functional PDF Error]: ${data}`));

    child.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).send('Failed to generate PDF');
        }
        const dateStr = new Date().toISOString().split('T')[0];
        res.download(safeOutputPath, `FunctionalTestReport_${dateStr}.pdf`, (err) => {
            if (err) console.error(err);
            // Cleanup
            try { fs.unlinkSync(safeOutputPath); } catch (e) { }
        });
    });
}

function downloadFailedScreenshots(req, res, automationDir) {
    const testResultsDir = path.join(automationDir, 'test-results');
    const tempDir = path.join(__dirname, '../../temp-functional-screenshots-' + Date.now());
    const zipPath = tempDir + '.zip';

    if (!fs.existsSync(testResultsDir)) {
        return res.status(404).send('No test results found');
    }

    try {
        fs.mkdirSync(tempDir);

        const getFiles = (dir, files = []) => {
            const fileList = fs.readdirSync(dir);
            for (const file of fileList) {
                const name = `${dir}/${file}`;
                if (fs.statSync(name).isDirectory()) {
                    getFiles(name, files);
                } else {
                    if (name.endsWith('.png') && name.includes('failed')) {
                        files.push(name);
                    }
                }
            }
            return files;
        };

        const allScreenshots = getFiles(testResultsDir);

        if (allScreenshots.length === 0) {
            fs.rmdirSync(tempDir);
            return res.status(404).json({ error: 'No screenshots found' });
        }

        allScreenshots.forEach((file) => {
            const filename = path.basename(file);
            const parentDir = path.basename(path.dirname(file));
            const dest = path.join(tempDir, `${parentDir}-${filename}`);
            fs.copyFileSync(file, dest);
        });

        const psCommand = `Compress-Archive -Path "${tempDir}\\*" -DestinationPath "${zipPath}"`;
        const child = spawn('powershell.exe', ['-Command', psCommand]);

        child.on('close', (code) => {
            if (code !== 0) {
                try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) { }
                return res.status(500).send('Failed to zip screenshots');
            }

            const dateStr = new Date().toISOString().split('T')[0];
            res.download(zipPath, `FunctionalFailedScreenshots_${dateStr}.zip`, (err) => {
                try {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    fs.unlinkSync(zipPath);
                } catch (e) { console.error("[Functional] Cleanup error:", e); }
            });
        });

    } catch (err) {
        console.error("[Functional] Screenshot error:", err);
        res.status(500).send(err.message);
    }
}

module.exports = {
    generatePdfReport,
    downloadFailedScreenshots
};
