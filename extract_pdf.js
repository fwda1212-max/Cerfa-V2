import fs from 'fs';

const historyPath = './migrated_prompt_history/prompt_2026-02-19T13:26:58.596Z.json';
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

// Find the message with the file
const message = history.find(m => m.payload && m.payload.files && m.payload.files.length > 0);

if (!message) {
  console.error('No file found in history');
  process.exit(1);
}

const fileInfo = JSON.parse(message.payload.files[0]);
const pdfData = Buffer.from(fileInfo.data, 'base64');

fs.writeFileSync('cerfa_14024-01.pdf', pdfData);
console.log('Extracted PDF to cerfa_14024-01.pdf');
