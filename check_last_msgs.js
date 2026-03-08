import fs from 'fs';

const historyPath = './migrated_prompt_history/prompt_2026-02-19T13:26:58.596Z.json';
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

for (let i = history.length - 5; i < history.length; i++) {
    const m = history[i];
    console.log(`Message ${i} author: ${m.author}`);
    if (m.payload && m.payload.files) {
        console.log(`Message ${i} has files: ${m.payload.files.length}`);
    }
}
