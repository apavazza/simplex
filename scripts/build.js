const { execSync } = require('child_process');

let gitHash = '';
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (error) {
  // Don't log the full error object, just a warning message.
  console.warn('Warning: Failed to retrieve Git hash. Proceeding without it.');
  // gitHash remains empty
}

try {
  console.log(`Building Next.js application${gitHash ? ` with version: ${gitHash}` : ''}...`);
  execSync('next build', {
    stdio: 'inherit', // Show build output directly in the console
    env: {
      ...process.env, // Pass through existing environment variables
      NEXT_PUBLIC_GIT_HASH: gitHash, // Add/overwrite our Git hash variable
    },
    // On non-Windows, it runs without an explicit shell by default with execSync (shell: false).
    shell: process.platform === 'win32' ? process.env.ComSpec || true : undefined,
  });
  console.log('Next.js application built successfully.');
} catch (buildError) {
  console.error('ERROR: Next.js build failed.');
  // execSync throws an error on non-zero exit code.
  // The error object (buildError) often contains a 'status' property with the exit code.
  process.exit(buildError.status || 1); // Exit with the build process's status code or 1
} 