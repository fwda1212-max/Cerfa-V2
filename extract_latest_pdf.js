import fs from 'fs';
import path from 'path';

const historyPath = './migrated_prompt_history/prompt_2026-02-19T13:26:58.596Z.json';
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

// Find the latest message with files
let latestFileMsg = null;
for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].payload && history[i].payload.files && history[i].payload.files.length > 0) {
        latestFileMsg = history[i];
        break;
    }
}

if (!latestFileMsg) {
    console.error('No file found in history');
    process.exit(1);
}

const fileInfo = JSON.parse(latestFileMsg.payload.files[0]);
console.log(`Extracting file: ${fileInfo.name} (${fileInfo.size} bytes)`);

const binaryData = Buffer.from(fileInfo.data, 'base64');
const outputPath = './public/cerfaTemplate_4.pdf';

// Ensure public directory exists
if (!fs.existsSync('./public')) {
    fs.mkdirSync('./public');
}

fs.writeFileSync(outputPath, binaryData);
const stats = fs.statSync(outputPath);
console.log(`Successfully saved to ${outputPath}`);
console.log(`Exact size: ${stats.size} bytes`);
