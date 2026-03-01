const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const nextOutputDir = path.join(projectRoot, '.next');
const licenseReportFileName = 'oss-licenses-client.json'; // emitted by webpack-license-plugin
let cachedLicenseReportPath = '';
const publicDir = path.join(projectRoot, 'public');
const exportDir = path.join(projectRoot, 'out');
const fileName = 'THIRD_PARTY_LICENSES.txt';
const licenseOutputPath = path.join(publicDir, fileName);
const separatorLine = '================================================================================';

function resolveLicenseReportPath() {
  if (cachedLicenseReportPath && fs.existsSync(cachedLicenseReportPath)) {
    return cachedLicenseReportPath;
  }

  const directCandidate = path.join(nextOutputDir, licenseReportFileName);
  if (fs.existsSync(directCandidate)) {
    cachedLicenseReportPath = directCandidate;
    return cachedLicenseReportPath;
  }

  const stack = [nextOutputDir];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];

    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      continue;
    }

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name === licenseReportFileName) {
        cachedLicenseReportPath = entryPath;
        return cachedLicenseReportPath;
      }
    }
  }

  throw new Error(`License report ${licenseReportFileName} not found under ${nextOutputDir}`);
}

function readWebpackLicenseReport() {
  const reportPath = resolveLicenseReportPath();
  const rawContent = fs.readFileSync(reportPath, 'utf-8');
  const parsed = JSON.parse(rawContent);

  if (!Array.isArray(parsed)) {
    throw new Error('Unexpected license report structure. Expected an array.');
  }

  return parsed.filter((pkg) => pkg && pkg.name && pkg.version);
}

function buildLicenseText(packages) {
  const sorted = [...packages].sort((a, b) => a.name.localeCompare(b.name));
  let buffer = '';

  for (const pkg of sorted) {
    buffer += `${separatorLine}\n`;
    buffer += `${pkg.name}\n`;
    buffer += `Version: ${pkg.version}\n`;
    buffer += `License: ${pkg.license || 'UNKNOWN'}\n`;
    buffer += `${separatorLine}\n\n`;

    const licenseText = typeof pkg.licenseText === 'string' ? pkg.licenseText : '';
    const hasLicenseText = typeof licenseText === 'string' && licenseText.trim().length > 0;
    const noticeText = typeof pkg.noticeText === 'string' ? pkg.noticeText : '';
    const hasNoticeText = typeof noticeText === 'string' && noticeText.trim().length > 0;

    if (hasLicenseText) {
      buffer += licenseText;
    } else {
      buffer += 'License text not found.\n';
    }

    if (hasNoticeText) {
      buffer += buffer.endsWith('\n') ? '' : '\n';
      buffer += `\nNOTICE:\n${noticeText}`;
    }

    buffer += '\n\n\n';
  }

  return buffer;
}

function writeLicenseFile() {
  try {
    console.log(`Generating ${fileName} from webpack license report...`);
    const packages = readWebpackLicenseReport();

    if (!packages.length) {
      console.warn('No bundled third-party packages reported by webpack. Skipping licenses.txt generation.');
      return false;
    }

    const licenseText = buildLicenseText(packages);
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(licenseOutputPath, licenseText);
    console.log(`${fileName} generated successfully with ${packages.length} packages.`);
    return true;
  } catch (error) {
    console.error(`Failed to generate ${fileName} (non-fatal):`, error.message);
    return false;
  }
}

function copyLicenseFileToExportDir() {
  if (!fs.existsSync(licenseOutputPath)) {
    console.warn(`Skipping export copy: ${fileName} has not been generated yet.`);
    return;
  }

  if (!fs.existsSync(exportDir)) {
    console.warn(`Skipping export copy: output directory ${exportDir} not found.`);
    return;
  }

  try {
    const destination = path.join(exportDir, fileName);
    fs.copyFileSync(licenseOutputPath, destination);
    console.log(`${fileName} copied to final export output.`);
  } catch (error) {
    console.error(`Failed to copy ${fileName} into export output (non-fatal):`, error.message);
  }
}

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
  execSync('next build --webpack', {
    stdio: 'inherit',
    env: {
      ...process.env, // Pass through existing environment variables
      NEXT_PUBLIC_GIT_HASH: gitHash, // Add/overwrite our Git hash variable
    },
    // On non-Windows, it runs without an explicit shell by default with execSync (shell: false).
    shell: process.platform === 'win32' ? process.env.ComSpec || true : undefined,
  });
  console.log('Next.js application built successfully.');
  const generatedLicense = writeLicenseFile();
  if (generatedLicense) {
    copyLicenseFileToExportDir();
  }
} catch (buildError) {
  console.error('ERROR: Next.js build failed.');
  // execSync throws an error on non-zero exit code.
  // The error object (buildError) often contains a 'status' property with the exit code.
  process.exit(buildError.status || 1); // Exit with the build process's status code or 1
} 