import fs from 'fs';

const historyPath = './migrated_prompt_history/prompt_2026-02-19T13:26:58.596Z.json';
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

history.forEach((m, i) => {
  if (m.payload && m.payload.files) {
    m.payload.files.forEach((f, j) => {
      try {
        const fileInfo = JSON.parse(f);
        console.log(`Message ${i}, File ${j}: ${fileInfo.name} (${fileInfo.size} bytes)`);
      } catch (e) {
        console.log(`Message ${i}, File ${j}: Could not parse file info`);
      }
    });
  }
});
