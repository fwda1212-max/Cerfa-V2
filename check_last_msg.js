import fs from 'fs';

const historyPath = './migrated_prompt_history/prompt_2026-02-19T13:26:58.596Z.json';
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

const lastMsg = history[history.length - 1];
console.log('Last message keys:', Object.keys(lastMsg));
if (lastMsg.payload && lastMsg.payload.files) {
  console.log('Last message has files:', lastMsg.payload.files.length);
  const fileInfo = JSON.parse(lastMsg.payload.files[0]);
  console.log('File name:', fileInfo.name);
  console.log('File size:', fileInfo.size);
} else {
  console.log('Last message has no files');
}
