import fs from 'fs';

const historyPath = './migrated_prompt_history/prompt_2026-02-19T13:26:58.596Z.json';
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

history.forEach((m, i) => {
    if (m.payload && m.payload.text) {
        const text = m.payload.text;
        if (text.length > 10000) {
            console.log(`Message ${i} has long text: ${text.length} chars`);
            if (text.includes('JVBERi')) {
                console.log(`Message ${i} contains PDF base64`);
            }
        }
    }
});
