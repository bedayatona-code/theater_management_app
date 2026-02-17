const fs = require('fs');
const buf = fs.readFileSync('banner_bedayatuna.jpeg');
const b64 = buf.toString('base64');
const content = `export const BANNER_IMAGE_BASE64 = "${b64}";\n`;
fs.writeFileSync('lib/bannerData.ts', content);
console.log('Banner data generated, base64 length:', b64.length);
