const fs = require('fs');
const path = 'src/services/letter_pdf.service.js';

let content = fs.readFileSync(path, 'utf8');
// Normalize line endings to \n for consistent matching
const lines = content.split(/\r?\n/);

// Check line 165 (0-indexed: 164)
console.log('Line 165:', JSON.stringify(lines[164]));

// Find the start of entity decoding block
let startIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Decode HTML entities')) {
    startIdx = i;
    break;
  }
}

if (startIdx >= 0 && lines[startIdx + 1] && lines[startIdx + 1].includes('.replace(/&/g,')) {
  console.log('Found buggy entity decoding. Fixing...');
  
  // Fix comment
  lines[startIdx] = lines[startIdx].replace(/MUST decode & FIRST/, 'MUST decode & FIRST');
  
  // Fix the 7 entity lines
  lines[startIdx + 1] = '      .replace(/&/g, \'&\')';
  lines[startIdx + 2] = '      .replace(/</g, \'<\')';
  lines[startIdx + 3] = '      .replace(/>/g, \'>\')';
  lines[startIdx + 4] = '      .replace(/&nbsp;/g, \' \')';
  lines[startIdx + 5] = '      .replace(/"/g, \'"\')';
  lines[startIdx + 6] = '      .replace(/&#x27;/g, "\'")';
  lines[startIdx + 7] = '      .replace(/'/g, "\'")';
  
  fs.writeFileSync(path, lines.join('\n'));
  console.log('SUCCESS');
} else {
  console.log('Already fixed or not found');
}