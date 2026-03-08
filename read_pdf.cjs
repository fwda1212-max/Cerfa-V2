const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('cerfa_14024-01.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(err => {
    console.error(err);
});
