const fs = require('fs');
const path = require('path');

// Create symlink from @prisma/client/.prisma to node_modules/.prisma
const targetDir = path.join(__dirname, '..', 'node_modules', '@prisma', 'client');
const symlinkPath = path.join(targetDir, '.prisma');
const targetPath = path.join(__dirname, '..', 'node_modules', '.prisma');

try {
  // Ensure the directory exists
  fs.mkdirSync(targetDir, { recursive: true });
  
  // Remove existing symlink if it exists
  try {
    fs.unlinkSync(symlinkPath);
  } catch (e) {
    // Ignore if it doesn't exist
  }
  
  // Create symlink
  fs.symlinkSync(path.relative(targetDir, targetPath), symlinkPath, 'dir');
  console.log('✓ Prisma client symlink created');
} catch (error) {
  // Ignore errors (symlink might already exist or permissions issue)
  if (error.code !== 'EEXIST') {
    console.warn('Warning: Could not create Prisma symlink:', error.message);
  }
}
