const fs = require('fs');
const path = require('path');

const historyFile = '/migrated_prompt_history/prompt_2026-02-19T13:26:58.596Z.json';
const outputFile = './public/cerfaTemplate_4.pdf';

try {
    const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    const lastMsg = history[history.length - 1];
    const filesStr = lastMsg.payload.files[0];
    const fileData = JSON.parse(filesStr);
    const base64Data = fileData.data;

    const binaryData = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(outputFile, binaryData);

    console.log(`Successfully wrote ${binaryData.length} bytes to ${outputFile}`);
} catch (error) {
    console.error('Error:', error);
    process.exit(1);
}
