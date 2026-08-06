const { createWorker } = require('tesseract.js');
const path = require('path');
const fs = require('fs');

async function runOCR() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node tesseract_ocr.js <image_path>');
    process.exit(1);
  }

  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error('File not found: ' + absPath);
    process.exit(1);
  }

  try {
    const worker = await createWorker('eng');
    const ret = await worker.recognize(absPath);
    const text = (ret && ret.data && ret.data.text) ? ret.data.text.trim() : '';
    console.log(text);
    await worker.terminate();
    process.exit(0);
  } catch (err) {
    console.error('tesseract.js OCR Error:', err);
    process.exit(1);
  }
}

runOCR();
