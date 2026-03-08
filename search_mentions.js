import fs from 'fs';

const historyPath = './migrated_prompt_history/prompt_2026-02-19T13:26:58.596Z.json';
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

console.log('History length:', history.length);
history.forEach((m, i) => {
    if (m.payload && m.payload.text && m.payload.text.includes('cerfaTemplate_4.pdf')) {
        console.log(`Message ${i} mentions cerfaTemplate_4.pdf`);
    }
});
