const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Files that affect tailwind styling compilation
const filesToCheck = [
  path.join(__dirname, 'index.html'),
  path.join(__dirname, 'tailwind.input.css'),
  path.join(__dirname, 'styles.css')
];
const outputFile = path.join(__dirname, 'tailwind.generated.css');

let shouldBuild = false;

if (!fs.existsSync(outputFile)) {
  shouldBuild = true;
  console.log('tailwind.generated.css does not exist. Initializing Tailwind build...');
} else {
  const outputMtime = fs.statSync(outputFile).mtime;
  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      const mtime = fs.statSync(file).mtime;
      if (mtime > outputMtime) {
        shouldBuild = true;
        console.log(`Detected change in: ${path.basename(file)}. Rebuilding Tailwind...`);
        break;
      }
    }
  }
}

if (shouldBuild) {
  try {
    execSync('npm run build:tailwind', { stdio: 'inherit' });
  } catch (e) {
    console.error('Tailwind build failed:', e);
    process.exit(1);
  }
} else {
  console.log('No styling changes detected. Skipping Tailwind build for instant startup.');
}
