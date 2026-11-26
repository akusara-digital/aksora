#!/usr/bin/env node
/**
 * Aksora - Automated Custom Domain Orchestrator
 *
 * This script automates end-to-end domain setup across all services:
 * 1. Assigns & verifies domain on Vercel project (API)
 * 2. Syncs NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_BASE_URL in Vercel remote envs
 * 3. Syncs NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_BASE_URL in local .env and .env.local
 * 4. Adds domain to Cloudflare Turnstile allowed origins
 * 5. Creates or updates Cloudflare DNS records (CNAME or A) if zone exists
 * 6. Generates exact Google OAuth Authorized JavaScript Origin checklist
 * 7. Optionally redeploys production build to bake the new domain into client chunks
 *
 * Usage:
 *   pnpm domain:setup <domain> [options]
 *   node scripts/setup-domain.mjs <domain> [options]
 *
 * Flags:
 *   --dry-run           Preview changes without executing mutations
 *   --redeploy          Trigger Vercel production deployment after setup
 *   --skip-dns          Skip Cloudflare DNS record creation
 *   --skip-turnstile    Skip Cloudflare Turnstile domain whitelist
 *   --skip-vercel-env   Skip remote Vercel env updates
 *   --skip-local-env    Skip local .env and .env.local file updates
 *   --help, -h          Show help message
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { execSync } from "child_process";

const rootDir = process.cwd();

// ANSI color helpers
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

function log(msg = "") {
  console.log(msg);
}
function success(msg) {
  console.log(`${colors.green}✔${colors.reset} ${msg}`);
}
function info(msg) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
}
function warn(msg) {
  console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
}
function error(msg) {
  console.error(`${colors.red}✖${colors.reset} ${msg}`);
}

/**
 * Load environment variables: .env.local > .env > process.env
 */
function loadEnvFiles() {
  const fileEnv = {};
  const envFiles = [".env", ".env.local"];

  for (const filename of envFiles) {
    const fullPath = path.join(rootDir, filename);
    if (fs.existsSync(fullPath)) {
      try {
        const text = fs.readFileSync(fullPath, "utf-8");
        for (const line of text.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
          const eqIdx = line.indexOf("=");
          const key = line.slice(0, eqIdx).trim();
          let val = line.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          fileEnv[key] = val;
        }
      } catch (err) {
        warn(`Could not read ${filename}: ${err.message}`);
      }
    }
  }

  // Repository .env and .env.local take precedence over inherited shell env
  return { ...process.env, ...fileEnv };
}

/**
 * Safely update or append key-value pairs in an env file while preserving comments and order
 */
function updateEnvFile(filePath, updates, dryRun = false) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const keysToUpdate = { ...updates };

  const lines = content.split(/\r?\n/);
  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) {
      return line;
    }
    const eqIdx = line.indexOf("=");
    const key = line.slice(0, eqIdx).trim();
    if (key in keysToUpdate) {
      const val = keysToUpdate[key];
      delete keysToUpdate[key];
      return `${key}=${val}`;
    }
    return line;
  });

  for (const [key, val] of Object.entries(keysToUpdate)) {
    newLines.push(`${key}=${val}`);
  }

  if (!dryRun) {
    fs.writeFileSync(filePath, newLines.join("\n"), "utf-8");
  }
  return true;
}

/**
 * Clean and normalize domain name
 */
function normalizeDomain(input) {
  if (!input) return "";
  let clean = input.trim().toLowerCase();
  clean = clean.replace(/^[a-z]+:\/\//i, ""); // remove http:// or https://
  clean = clean.replace(/[\/:?#].*$/, ""); // remove path, query, hash, trailing slashes
  clean = clean.replace(/:\d+$/, ""); // remove port
  return clean;
}

/**
 * Extract apex domain name (e.g. aksora.akusaradigital.com -> akusaradigital.com)
 */
function getApexDomain(domain) {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;

  // Handle common compound TLDs (.co.id, .my.id, .com.au, .co.uk, etc.)
  const secondLevelTlds = ["co.id", "my.id", "web.id", "or.id", "go.id", "ac.id", "sch.id", "biz.id", "com.au", "co.uk", "org.uk", "co.jp"];
  const lastTwo = parts.slice(-2).join(".");
  if (secondLevelTlds.includes(lastTwo) && parts.length > 2) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

/**
 * Parse CLI args
 */
function parseArgs() {
  const rawArgs = process.argv.slice(2);
  let domain = "";
  const flags = {
    dryRun: false,
    redeploy: false,
    skipDns: false,
    skipTurnstile: false,
    skipVercelEnv: false,
    skipLocalEnv: false,
    help: false,
  };

  for (const arg of rawArgs) {
    if (arg === "--help" || arg === "-h") {
      flags.help = true;
    } else if (arg === "--dry-run") {
      flags.dryRun = true;
    } else if (arg === "--redeploy") {
      flags.redeploy = true;
    } else if (arg === "--skip-dns") {
      flags.skipDns = true;
    } else if (arg === "--skip-turnstile") {
      flags.skipTurnstile = true;
    } else if (arg === "--skip-vercel-env") {
      flags.skipVercelEnv = true;
    } else if (arg === "--skip-local-env") {
      flags.skipLocalEnv = true;
    } else if (!arg.startsWith("-") && !domain) {
      domain = normalizeDomain(arg);
    }
  }

  return { domain, flags };
}

/**
 * Ask user via CLI prompt if no domain is provided
 */
async function promptDomain() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.cyan}?${colors.reset} Enter custom domain (e.g. ${colors.bold}aksora.akusaradigital.com${colors.reset}): `, (answer) => {
      rl.close();
      resolve(normalizeDomain(answer));
    });
  });
}

/**
 * Main Orchestrator Function
 */
async function run() {
  const { domain: cliDomain, flags } = parseArgs();

  if (flags.help) {
    log(`
${colors.bold}Aksora - Automated Domain Orchestrator${colors.reset}

${colors.cyan}Usage:${colors.reset}
  pnpm domain:setup <domain> [options]
  node scripts/setup-domain.mjs <domain> [options]

${colors.cyan}Examples:${colors.reset}
  pnpm domain:setup aksora.akusaradigital.com
  pnpm domain:setup aksora.com --redeploy
  pnpm domain:setup mydomain.org --dry-run

${colors.cyan}Options:${colors.reset}
  --dry-run           Preview all actions without applying them
  --redeploy          Trigger Vercel production build after sync
  --skip-dns          Skip Cloudflare DNS record check and creation
  --skip-turnstile    Skip Cloudflare Turnstile allowed origin update
  --skip-vercel-env   Skip remote Vercel environment variables update
  --skip-local-env    Skip local .env and .env.local file updates
  --help, -h          Show this help message
`);
    process.exit(0);
  }

  log(`\n${colors.bold}${colors.magenta}=== AKSORA DOMAIN ORCHESTRATOR ===${colors.reset}\n`);

  let domain = cliDomain;
  if (!domain) {
    domain = await promptDomain();
  }

  if (!domain || !domain.includes(".")) {
    error("Invalid domain provided. Expected format: domain.com or sub.domain.com");
    process.exit(1);
  }

  const apexDomain = getApexDomain(domain);
  const isSubdomain = domain !== apexDomain;
  const targetUrl = `https://${domain}`;

  info(`Target domain : ${colors.bold}${domain}${colors.reset}`);
  info(`Target URL    : ${colors.bold}${targetUrl}${colors.reset}`);
  info(`Apex domain   : ${colors.dim}${apexDomain}${colors.reset} (${isSubdomain ? "Subdomain" : "Apex"})`);
  if (flags.dryRun) {
    warn(`DRY-RUN MODE ACTIVE: No actual mutations will be performed.\n`);
  } else {
    log();
  }

  // 1. Load Environment & Tokens
  const env = loadEnvFiles();
  const vercelToken = env.VERCEL_TOKEN;
  const vercelTeamId = env.VERCEL_TEAM_ID || "team_hR7QZryGuZqcaKlPA3sbn4Tz";
  const vercelProjectId = env.VERCEL_PROJECT_ID || "prj_oKSNx790XbN9ANBCjNoZhvlftHo7";

  const cfApiToken = env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_GLOBAL_API_KEY;
  const cfAccountId = env.CLOUDFLARE_ACCOUNT_ID || "1402c39fe47e68af46c97ec90aa8dfb9";
  const turnstileSiteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAGQS213uIsg-UCu4";
  const googleClientId = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || "915473018543-40bhajhc3scd5jdjercng1dqb74m79hu.apps.googleusercontent.com";

  // Vercel Project Domain Assignment
  log(`${colors.bold}[1/6] Vercel Domain Configuration${colors.reset}`);
  if (!vercelToken) {
    warn("VERCEL_TOKEN not found in env. Skipping Vercel domain assignment.");
  } else {
    try {
      // Check existing project domains
      const listRes = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/domains?teamId=${vercelTeamId}`,
        { headers: { Authorization: `Bearer ${vercelToken}` } }
      );
      const listData = await listRes.json();
      const existingDomain = (listData.domains || []).find((d) => d.name === domain);

      if (existingDomain) {
        success(`Domain ${colors.bold}${domain}${colors.reset} is already assigned to Vercel project.`);
      } else {
        if (!flags.dryRun) {
          const addRes = await fetch(
            `https://api.vercel.com/v9/projects/${vercelProjectId}/domains?teamId=${vercelTeamId}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${vercelToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ name: domain }),
            }
          );
          const addData = await addRes.json();
          if (addData.error) {
            warn(`Vercel domain add notice: ${addData.error.message || JSON.stringify(addData.error)}`);
          } else {
            success(`Domain ${colors.bold}${domain}${colors.reset} added to Vercel project.`);
          }
        } else {
          info(`[DRY-RUN] Would add ${domain} to Vercel project ${vercelProjectId}`);
        }
      }

      // Check Vercel domain verification & DNS config
      try {
        const confRes = await fetch(
          `https://api.vercel.com/v6/domains/${domain}/config?teamId=${vercelTeamId}`,
          { headers: { Authorization: `Bearer ${vercelToken}` } }
        );
        const conf = await confRes.json();
        if (conf.misconfigured) {
          warn(`DNS status: Not yet configured / propagating.`);
          info(`Required DNS Record:`);
          if (isSubdomain) {
            log(`  Type:  ${colors.bold}CNAME${colors.reset}`);
            log(`  Name:  ${colors.bold}${domain.replace("." + apexDomain, "")}${colors.reset}`);
            log(`  Value: ${colors.bold}cname.vercel-dns.com${colors.reset}`);
          } else {
            log(`  Type:  ${colors.bold}A${colors.reset}`);
            log(`  Name:  ${colors.bold}@${colors.reset}`);
            log(`  Value: ${colors.bold}76.76.21.21${colors.reset}`);
          }
        } else {
          success(`DNS status on Vercel: Valid and configured.`);
        }
      } catch (err) {
        warn(`Could not fetch Vercel domain config details: ${err.message}`);
      }
    } catch (err) {
      error(`Failed communicating with Vercel API: ${err.message}`);
    }
  }

  // Vercel Remote Environment Variables
  log(`\n${colors.bold}[2/6] Vercel Remote Environment Variables${colors.reset}`);
  if (flags.skipVercelEnv || !vercelToken) {
    info("Skipping Vercel remote environment variables sync.");
  } else {
    try {
      const envRes = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/env?teamId=${vercelTeamId}`,
        { headers: { Authorization: `Bearer ${vercelToken}` } }
      );
      const envData = await envRes.json();
      const existingEnvs = envData.envs || [];

      const keysToSync = {
        NEXT_PUBLIC_APP_URL: targetUrl,
        NEXT_PUBLIC_BASE_URL: targetUrl,
      };

      for (const [key, val] of Object.entries(keysToSync)) {
        const found = existingEnvs.find((e) => e.key === key);
        if (flags.dryRun) {
          info(`[DRY-RUN] Would ${found ? "update" : "create"} ${key}=${val} on Vercel`);
          continue;
        }

        if (found) {
          const patchRes = await fetch(
            `https://api.vercel.com/v9/projects/${vercelProjectId}/env/${found.id}?teamId=${vercelTeamId}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${vercelToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                value: val,
                target: ["production", "preview", "development"],
              }),
            }
          );
          if (patchRes.ok) {
            success(`Updated Vercel env ${colors.bold}${key}${colors.reset} -> ${val}`);
          } else {
            const errJson = await patchRes.json();
            warn(`Failed updating Vercel env ${key}: ${JSON.stringify(errJson)}`);
          }
        } else {
          const postRes = await fetch(
            `https://api.vercel.com/v10/projects/${vercelProjectId}/env?teamId=${vercelTeamId}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${vercelToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                key,
                value: val,
                type: "plain",
                target: ["production", "preview", "development"],
              }),
            }
          );
          if (postRes.ok) {
            success(`Created Vercel env ${colors.bold}${key}${colors.reset} -> ${val}`);
          } else {
            const errJson = await postRes.json();
            warn(`Failed creating Vercel env ${key}: ${JSON.stringify(errJson)}`);
          }
        }
      }
    } catch (err) {
      error(`Failed updating Vercel env variables: ${err.message}`);
    }
  }

  // Local Environment Files Sync
  log(`\n${colors.bold}[3/6] Local Environment Files (.env, .env.local)${colors.reset}`);
  if (flags.skipLocalEnv) {
    info("Skipping local environment files sync.");
  } else {
    const localUpdates = {
      NEXT_PUBLIC_APP_URL: targetUrl,
      NEXT_PUBLIC_BASE_URL: targetUrl,
    };

    for (const filename of [".env", ".env.local"]) {
      const fullPath = path.join(rootDir, filename);
      if (fs.existsSync(fullPath)) {
        if (!flags.dryRun) {
          updateEnvFile(fullPath, localUpdates, false);
          success(`Updated ${colors.bold}${filename}${colors.reset} with new base URL.`);
        } else {
          info(`[DRY-RUN] Would update ${filename} with ${JSON.stringify(localUpdates)}`);
        }
      }
    }
  }

  // Cloudflare Turnstile Origin Whitelist
  log(`\n${colors.bold}[4/6] Cloudflare Turnstile Bot Protection${colors.reset}`);
  if (flags.skipTurnstile || !cfApiToken) {
    info("Skipping Cloudflare Turnstile sync (no token or skipped).");
  } else {
    try {
      const widgetRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/challenges/widgets/${turnstileSiteKey}`,
        {
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const widgetData = await widgetRes.json();

      if (widgetData.success && widgetData.result) {
        const widget = widgetData.result;
        const currentDomains = widget.domains || [];

        if (currentDomains.includes(domain)) {
          success(`Domain ${colors.bold}${domain}${colors.reset} is already allowed in Turnstile widget.`);
        } else {
          const updatedDomains = [...currentDomains, domain];
          if (!flags.dryRun) {
            const updateRes = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/challenges/widgets/${turnstileSiteKey}`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${cfApiToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: widget.name,
                  domains: updatedDomains,
                  mode: widget.mode || "managed",
                }),
              }
            );
            const updateJson = await updateRes.json();
            if (updateJson.success) {
              success(`Added ${colors.bold}${domain}${colors.reset} to Turnstile allowed domains.`);
            } else {
              warn(`Could not update Turnstile domains: ${JSON.stringify(updateJson.errors)}`);
            }
          } else {
            info(`[DRY-RUN] Would add ${domain} to Turnstile widget ${turnstileSiteKey}`);
          }
        }
      } else {
        warn(`Could not fetch Turnstile widget: ${JSON.stringify(widgetData.errors || widgetData)}`);
      }
    } catch (err) {
      warn(`Failed connecting to Cloudflare Turnstile API: ${err.message}`);
    }
  }

  // Cloudflare DNS Sync (Auto-detection)
  log(`\n${colors.bold}[5/6] Cloudflare DNS Management${colors.reset}`);
  if (flags.skipDns || !cfApiToken) {
    info("Skipping Cloudflare DNS management.");
  } else {
    try {
      const zonesRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones?name=${apexDomain}`,
        {
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const zonesData = await zonesRes.json();
      const zone = (zonesData.result || []).find((z) => z.name === apexDomain);

      if (zone) {
        info(`Found Cloudflare zone for ${colors.bold}${apexDomain}${colors.reset} (ID: ${zone.id})`);

        // Check existing DNS record
        const dnsRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records?name=${domain}`,
          {
            headers: {
              Authorization: `Bearer ${cfApiToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        const dnsData = await dnsRes.json();
        const existingRecord = (dnsData.result || [])[0];

        const recordType = isSubdomain ? "CNAME" : "A";
        const recordContent = isSubdomain ? "cname.vercel-dns.com" : "76.76.21.21";

        if (existingRecord) {
          if (existingRecord.type === recordType && existingRecord.content === recordContent) {
            success(`DNS record ${colors.bold}${domain}${colors.reset} -> ${recordContent} already configured in Cloudflare.`);
          } else {
            if (!flags.dryRun) {
              const putRes = await fetch(
                `https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records/${existingRecord.id}`,
                {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${cfApiToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    type: recordType,
                    name: domain,
                    content: recordContent,
                    ttl: 1, // Auto
                    proxied: false, // DNS only recommended for initial Vercel SSL
                  }),
                }
              );
              const putData = await putRes.json();
              if (putData.success) {
                success(`Updated DNS ${recordType} record: ${domain} -> ${recordContent}`);
              } else {
                warn(`Could not update DNS record: ${JSON.stringify(putData.errors)}`);
              }
            } else {
              info(`[DRY-RUN] Would update DNS ${recordType} record: ${domain} -> ${recordContent}`);
            }
          }
        } else {
          if (!flags.dryRun) {
            const createRes = await fetch(
              `https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${cfApiToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  type: recordType,
                  name: domain,
                  content: recordContent,
                  ttl: 1, // Auto
                  proxied: false, // DNS only
                }),
              }
            );
            const createData = await createRes.json();
            if (createData.success) {
              success(`Created Cloudflare DNS ${recordType} record: ${domain} -> ${recordContent}`);
            } else {
              warn(`Could not create DNS record: ${JSON.stringify(createData.errors)}`);
            }
          } else {
            info(`[DRY-RUN] Would create DNS ${recordType} record: ${domain} -> ${recordContent}`);
          }
        }
      } else {
        info(`Cloudflare zone for ${colors.bold}${apexDomain}${colors.reset} not hosted in this Cloudflare account.`);
        info(`If your domain is at another DNS provider (Niagahoster, Namecheap, GoDaddy, etc.), add this record:`);
        log(`    ${colors.bold}${isSubdomain ? "CNAME" : "A"}${colors.reset} : ${domain}  -->  ${isSubdomain ? "cname.vercel-dns.com" : "76.76.21.21"}`);
      }
    } catch (err) {
      warn(`Failed checking Cloudflare DNS: ${err.message}`);
    }
  }

  // Google OAuth / GIS Checklist
  log(`\n${colors.bold}[6/6] Google OAuth Credentials Checklist${colors.reset}`);
  log(`Google Sign-In requires Authorized JavaScript Origins for new domains.`);
  log(`1. Open Google Cloud Console:`);
  log(`   ${colors.cyan}https://console.cloud.google.com/apis/credentials${colors.reset}`);
  log(`2. Open OAuth 2.0 Client ID:`);
  log(`   ${colors.dim}${googleClientId}${colors.reset}`);
  log(`3. Under ${colors.bold}"Authorized JavaScript origins"${colors.reset}, add:`);
  log(`   ${colors.green}✔ ${targetUrl}${colors.reset}`);
  log(`4. Under ${colors.bold}"Authorized redirect URIs"${colors.reset} (if needed), add:`);
  log(`   ${colors.green}✔ ${targetUrl}/api/auth/callback/google${colors.reset}`);

  // SUMMARY & DEPLOYMENT
  log(`\n${colors.bold}${colors.green}=== DOMAIN SETUP COMPLETE ===${colors.reset}`);
  log(`Your application is now configured for ${colors.bold}${targetUrl}${colors.reset}`);

  if (flags.redeploy) {
    log(`\n${colors.bold}Triggering Vercel production deployment...${colors.reset}`);
    try {
      execSync(`npx vercel deploy --prod --yes`, {
        stdio: "inherit",
        env: { ...process.env, VERCEL_TOKEN: vercelToken },
      });
      success("Vercel production deployment triggered successfully!");
    } catch (err) {
      warn(`Could not automatically trigger deploy: ${err.message}`);
      info(`You can redeploy manually with: ${colors.bold}npx vercel --prod${colors.reset}`);
    }
  } else {
    log(`\n${colors.bold}Next Step (Recommended):${colors.reset}`);
    log(`Next.js inlines public environment variables into client bundles at build time.`);
    log(`To bake ${colors.bold}${targetUrl}${colors.reset} into the live site, deploy to Vercel:`);
    log(`  ${colors.cyan}npx vercel deploy --prod${colors.reset}`);
  }
}

run().catch((err) => {
  error(`Unexpected error: ${err.stack || err.message}`);
  process.exit(1);
});
