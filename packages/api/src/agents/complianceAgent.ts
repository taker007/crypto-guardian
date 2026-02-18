// =============================================================================
// METAMASK SNAP COMPLIANCE AUDIT AGENT
// =============================================================================
// Automated compliance auditor for the Crypto Guardian MetaMask Snap.
// Checks manifest permissions, network access, private key usage, and
// website compliance (privacy policy + terms of service).
//
// Run: npm run compliance-audit
// Output: compliance-report.json
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckResult {
  status: 'PASS' | 'FAIL';
  details: string[];
}

interface ComplianceReport {
  generatedAt: string;
  manifestPermissions: 'PASS' | 'FAIL';
  networkAccess: 'PASS' | 'FAIL';
  privateKeyAccess: 'PASS' | 'FAIL';
  privacyPolicy: 'PASS' | 'FAIL';
  terms: 'PASS' | 'FAIL';
  overallStatus: 'COMPLIANT' | 'NON_COMPLIANT';
  details: {
    manifestPermissions: string[];
    networkAccess: string[];
    privateKeyAccess: string[];
    privacyPolicy: string[];
    terms: string[];
  };
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SNAP_DIR = path.join(PROJECT_ROOT, 'packages', 'snap');
const SNAP_SRC_DIR = path.join(SNAP_DIR, 'src');
const SNAP_BUNDLE_PATH = path.join(SNAP_DIR, 'dist', 'bundle.js');
const MANIFEST_PATH = path.join(SNAP_DIR, 'snap.manifest.json');
const REPORT_PATH = path.join(PROJECT_ROOT, 'compliance-report.json');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_PERMISSIONS = [
  'endowment:network-access',
  'endowment:rpc',
  'snap_dialog',
];

const FORBIDDEN_PERMISSIONS = [
  'snap_manageAccounts',
  'snap_getBip44Entropy',
  'snap_signTransaction',
];

const ALLOWED_OUTBOUND_HOSTS = [
  'cryptoguardians.io',
];

const PRIVATE_KEY_APIS = [
  'snap_getBip44Entropy',
  'snap_manageAccounts',
];

const WEBSITE_URLS = {
  privacy: 'https://cryptoguardians.io/privacy',
  terms: 'https://cryptoguardians.io/terms',
};

// ---------------------------------------------------------------------------
// CHECK 1 — Snap Manifest Permissions
// ---------------------------------------------------------------------------

function checkManifestPermissions(): CheckResult {
  const details: string[] = [];
  let pass = true;

  if (!fs.existsSync(MANIFEST_PATH)) {
    return { status: 'FAIL', details: ['snap.manifest.json not found'] };
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const permissions = Object.keys(manifest.initialPermissions || {});

  details.push(`Declared permissions: ${permissions.join(', ') || '(none)'}`);

  // Check for forbidden permissions
  for (const perm of FORBIDDEN_PERMISSIONS) {
    if (permissions.includes(perm)) {
      details.push(`FORBIDDEN permission found: ${perm}`);
      pass = false;
    }
  }

  // Flag unknown permissions (not in allowed list)
  for (const perm of permissions) {
    if (!ALLOWED_PERMISSIONS.includes(perm)) {
      details.push(`Unexpected permission: ${perm} (not in allowed list, review required)`);
    }
  }

  if (pass) {
    details.push('No forbidden permissions detected');
  }

  return { status: pass ? 'PASS' : 'FAIL', details };
}

// ---------------------------------------------------------------------------
// CHECK 2 — Network Access Audit
// ---------------------------------------------------------------------------
// Audits the PRODUCTION BUNDLE (dist/bundle.js) — this is what ships to users.
// Source files may contain dev-only URLs behind environment guards (config.ts),
// but the bundler eliminates them in production builds.
// ---------------------------------------------------------------------------

function checkNetworkAccess(): CheckResult {
  const details: string[] = [];
  let pass = true;

  // Primary check: audit the production bundle
  if (fs.existsSync(SNAP_BUNDLE_PATH)) {
    details.push('Auditing production bundle: packages/snap/dist/bundle.js');
    const bundleContent = fs.readFileSync(SNAP_BUNDLE_PATH, 'utf-8');
    const urlRegex = /(?:https?:\/\/)[^\s'"`,)}\]]+/g;
    const bundleUrls = bundleContent.match(urlRegex) || [];

    for (const url of bundleUrls) {
      let hostname: string;
      try {
        hostname = new URL(url).hostname;
      } catch {
        continue;
      }

      const isAllowed = ALLOWED_OUTBOUND_HOSTS.some(
        (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
      );

      if (isAllowed) {
        details.push(`ALLOWED: ${url} (in bundle)`);
      } else {
        details.push(`FLAGGED: ${url} (in bundle) — not in allowed host list`);
        pass = false;
      }
    }

    if (bundleUrls.length === 0) {
      details.push('No outbound URLs found in production bundle');
    }
  } else {
    details.push('WARNING: Production bundle not found — run "mm-snap build" with NODE_ENV=production first');
    details.push('Falling back to source file scan...');

    // Fallback: scan source files
    if (!fs.existsSync(SNAP_SRC_DIR)) {
      return { status: 'FAIL', details: [...details, 'packages/snap/src/ directory not found'] };
    }

    const srcFiles = getTypeScriptFiles(SNAP_SRC_DIR);
    details.push(`Scanned ${srcFiles.length} source file(s)`);

    const urlRegex = /(?:https?:\/\/)[^\s'"`,)}\]]+/g;

    for (const filePath of srcFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relPath = path.relative(PROJECT_ROOT, filePath);
      const matches = content.match(urlRegex);
      if (!matches) continue;

      for (const url of matches) {
        let hostname: string;
        try {
          hostname = new URL(url).hostname;
        } catch {
          continue;
        }

        const isAllowed = ALLOWED_OUTBOUND_HOSTS.some(
          (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
        );

        if (isAllowed) {
          details.push(`ALLOWED: ${url} (in ${relPath})`);
        } else {
          details.push(`FLAGGED: ${url} (in ${relPath}) — not in allowed host list`);
          pass = false;
        }
      }
    }
  }

  return { status: pass ? 'PASS' : 'FAIL', details };
}

// ---------------------------------------------------------------------------
// CHECK 3 — Private Key Access Check
// ---------------------------------------------------------------------------

function checkPrivateKeyAccess(): CheckResult {
  const details: string[] = [];
  let pass = true;

  if (!fs.existsSync(SNAP_SRC_DIR)) {
    return { status: 'FAIL', details: ['packages/snap/src/ directory not found'] };
  }

  const srcFiles = getTypeScriptFiles(SNAP_SRC_DIR);

  for (const filePath of srcFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relPath = path.relative(PROJECT_ROOT, filePath);

    for (const api of PRIVATE_KEY_APIS) {
      if (content.includes(api)) {
        details.push(`FORBIDDEN API call found: ${api} in ${relPath}`);
        pass = false;
      }
    }
  }

  if (pass) {
    details.push(`No private key API calls found across ${srcFiles.length} file(s)`);
  }

  return { status: pass ? 'PASS' : 'FAIL', details };
}

// ---------------------------------------------------------------------------
// CHECK 4 — Website Compliance Check (Privacy + Terms)
// ---------------------------------------------------------------------------

function httpHead(url: string): Promise<{ statusCode: number; ok: boolean }> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
      // Follow redirects (301, 302, 307, 308)
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpHead(res.headers.location).then(resolve);
        return;
      }
      resolve({ statusCode: res.statusCode || 0, ok: res.statusCode === 200 });
    });
    req.on('error', () => resolve({ statusCode: 0, ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ statusCode: 0, ok: false }); });
    req.end();
  });
}

async function checkWebsitePage(url: string): Promise<CheckResult> {
  const details: string[] = [];

  try {
    const result = await httpHead(url);
    if (result.ok) {
      details.push(`${url} returned HTTP ${result.statusCode}`);
      return { status: 'PASS', details };
    } else {
      details.push(`${url} returned HTTP ${result.statusCode || 'UNREACHABLE'}`);
      return { status: 'FAIL', details };
    }
  } catch (err: any) {
    details.push(`${url} — error: ${err.message || err}`);
    return { status: 'FAIL', details };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTypeScriptFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...getTypeScriptFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function runComplianceAudit(): Promise<void> {
  console.log('=== MetaMask Snap Compliance Audit Agent ===\n');

  // CHECK 1 — Manifest Permissions
  console.log('[1/5] Checking manifest permissions...');
  const manifestResult = checkManifestPermissions();
  console.log(`  Result: ${manifestResult.status}`);
  for (const d of manifestResult.details) console.log(`    ${d}`);

  // CHECK 2 — Network Access
  console.log('\n[2/5] Auditing network access...');
  const networkResult = checkNetworkAccess();
  console.log(`  Result: ${networkResult.status}`);
  for (const d of networkResult.details) console.log(`    ${d}`);

  // CHECK 3 — Private Key Access
  console.log('\n[3/5] Checking private key access...');
  const privateKeyResult = checkPrivateKeyAccess();
  console.log(`  Result: ${privateKeyResult.status}`);
  for (const d of privateKeyResult.details) console.log(`    ${d}`);

  // CHECK 4 — Privacy Policy
  console.log('\n[4/5] Checking privacy policy page...');
  const privacyResult = await checkWebsitePage(WEBSITE_URLS.privacy);
  console.log(`  Result: ${privacyResult.status}`);
  for (const d of privacyResult.details) console.log(`    ${d}`);

  // CHECK 5 — Terms of Service
  console.log('\n[5/5] Checking terms of service page...');
  const termsResult = await checkWebsitePage(WEBSITE_URLS.terms);
  console.log(`  Result: ${termsResult.status}`);
  for (const d of termsResult.details) console.log(`    ${d}`);

  // Build report
  const allPassed = [
    manifestResult, networkResult, privateKeyResult, privacyResult, termsResult,
  ].every((r) => r.status === 'PASS');

  const report: ComplianceReport = {
    generatedAt: new Date().toISOString(),
    manifestPermissions: manifestResult.status,
    networkAccess: networkResult.status,
    privateKeyAccess: privateKeyResult.status,
    privacyPolicy: privacyResult.status,
    terms: termsResult.status,
    overallStatus: allPassed ? 'COMPLIANT' : 'NON_COMPLIANT',
    details: {
      manifestPermissions: manifestResult.details,
      networkAccess: networkResult.details,
      privateKeyAccess: privateKeyResult.details,
      privacyPolicy: privacyResult.details,
      terms: termsResult.details,
    },
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');

  console.log(`\n=== Overall: ${report.overallStatus} ===`);
  console.log(`Report written to: ${REPORT_PATH}\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

runComplianceAudit().catch((err) => {
  console.error('Compliance audit failed:', err);
  process.exit(1);
});
