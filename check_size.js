import fs from 'fs';
const stats = fs.statSync('cerfa_14024-01.pdf');
console.log(`File size: ${stats.size} bytes`);
