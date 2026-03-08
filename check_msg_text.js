import fs from 'fs';

const historyPath = './migrated_prompt_history/prompt_2026-02-19T13:26:58.596Z.json';
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

const m = history[47];
console.log('Message 47 text:', m.payload.text);
