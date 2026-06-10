'use strict';

/**
 * Manual test file for fileValidation utility
 * Run with: node fileValidation.test.js
 */

const { validateImageMagicBytes, getFileSignature } = require('./fileValidation');

console.log('=== File Validation Magic Bytes Tests ===\n');

// Test 1: Valid JPEG
console.log('Test 1: Valid JPEG');
const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01]);
const jpegResult = validateImageMagicBytes(jpegBuffer);
console.log('Result:', jpegResult);
console.log('Signature:', getFileSignature(jpegBuffer));
console.log('Expected: valid=true, type=jpeg\n');

// Test 2: Valid PNG
console.log('Test 2: Valid PNG');
const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const pngResult = validateImageMagicBytes(pngBuffer);
console.log('Result:', pngResult);
console.log('Signature:', getFileSignature(pngBuffer));
console.log('Expected: valid=true, type=png\n');

// Test 3: Valid WEBP
console.log('Test 3: Valid WEBP');
const webpBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20]);
const webpResult = validateImageMagicBytes(webpBuffer);
console.log('Result:', webpResult);
console.log('Signature:', getFileSignature(webpBuffer));
console.log('Expected: valid=true, type=webp\n');

// Test 4: Valid GIF (89a)
console.log('Test 4: Valid GIF89a');
const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff]);
const gifResult = validateImageMagicBytes(gifBuffer);
console.log('Result:', gifResult);
console.log('Signature:', getFileSignature(gifBuffer));
console.log('Expected: valid=true, type=gif\n');

// Test 5: Invalid - EXE file (PE header)
console.log('Test 5: Invalid - EXE file (PE/DOS header)');
const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);
const exeResult = validateImageMagicBytes(exeBuffer);
console.log('Result:', exeResult);
console.log('Signature:', getFileSignature(exeBuffer));
console.log('Expected: valid=false (EXE detected)\n');

// Test 6: Invalid - ZIP file
console.log('Test 6: Invalid - ZIP file');
const zipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const zipResult = validateImageMagicBytes(zipBuffer);
console.log('Result:', zipResult);
console.log('Signature:', getFileSignature(zipBuffer));
console.log('Expected: valid=false (ZIP detected)\n');

// Test 7: Invalid - PHP script
console.log('Test 7: Invalid - PHP script');
const phpBuffer = Buffer.from([0x3c, 0x3f, 0x70, 0x68, 0x70, 0x20, 0x65, 0x63, 0x68, 0x6f, 0x20, 0x22, 0x74, 0x65, 0x73, 0x74]);
const phpResult = validateImageMagicBytes(phpBuffer);
console.log('Result:', phpResult);
console.log('Signature:', getFileSignature(phpBuffer));
console.log('Expected: valid=false (PHP detected)\n');

// Test 8: Invalid - Empty buffer
console.log('Test 8: Invalid - Empty/small buffer');
const emptyBuffer = Buffer.from([0x00, 0x00]);
const emptyResult = validateImageMagicBytes(emptyBuffer);
console.log('Result:', emptyResult);
console.log('Expected: valid=false (too small)\n');

// Test 9: Invalid - Null buffer
console.log('Test 9: Invalid - Null buffer');
const nullResult = validateImageMagicBytes(null);
console.log('Result:', nullResult);
console.log('Expected: valid=false (invalid buffer)\n');

console.log('=== All Tests Complete ===');
console.log('\nSUMMARY:');
console.log('✓ Valid images (JPEG, PNG, WEBP, GIF) should pass');
console.log('✓ Invalid files (EXE, ZIP, PHP, etc.) should be rejected');
console.log('✓ Edge cases (empty, null) should be handled safely');
