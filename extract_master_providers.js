const https = require('https');
const fs = require('fs');
const path = require('path');

function getHtml(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, html: data }));
    });
    req.on('error', (err) => resolve({ statusCode: 0, html: '', error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ statusCode: 408, html: '', error: 'timeout' }); });
  });
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const s = String(val).replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
}

async function run() {
  console.log('Fetching https://igamingapis.com/products/...');
  const { statusCode, html } = await getHtml('https://igamingapis.com/products/');
  if (statusCode !== 200 || !html) {
    console.error(`Failed to fetch products page! HTTP ${statusCode}`);
    process.exit(1);
  }

  // Extract all simple-brand-grid-item divs
  const itemRegex = /<div class="simple-brand-grid-item([^"]*)"([^>]*)>([\s\S]*?)<\/div>\s*(?=<div class="simple-brand-grid-item|<\/div>\s*<\/div>|$)/gi;
  let match;
  const rawProviders = [];

  // Match pattern inside grid
  const gridMatches = html.match(/<div class="simple-brand-grid-item[^"]*"[^>]*>[\s\S]*?<\/div>/gi) || [];
  console.log(`Raw grid items matched: ${gridMatches.length}`);

  // Alternative robust parser: scan all <div class="simple-brand-grid-item...
  const divSplits = html.split('<div class="simple-brand-grid-item');
  console.log(`Div split segments count: ${divSplits.length - 1}`);

  for (let i = 1; i < divSplits.length; i++) {
    const segment = divSplits[i];
    
    // Attributes
    const isHot = segment.includes('is-hot') || segment.includes('data-sbg-hot="1"');
    const catMatch = segment.match(/data-sbg-cat="([^"]+)"/i);
    const rankMatch = segment.match(/data-sbg-rank="([^"]+)"/i);
    const nameMatch = segment.match(/data-sbg-name="([^"]+)"/i);
    const hrefMatch = segment.match(/href="([^"]+)"/i);
    const logoMatch = segment.match(/class="simple-brand-grid-logo"[^>]*src="([^"]+)"/i) 
                   || segment.match(/<img[^>]*class="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i)
                   || segment.match(/<img[^>]*src="([^"]+)"/i);

    const name = nameMatch ? nameMatch[1].trim() : '';
    const category = catMatch ? catMatch[1].trim().toLowerCase() : 'slots';
    const rank = rankMatch ? parseInt(rankMatch[1], 10) : 0;
    const providerUrl = hrefMatch ? hrefMatch[1].trim() : '';
    const logo = logoMatch ? logoMatch[1].trim() : '';

    let slug = '';
    if (providerUrl) {
      const slugMatch = providerUrl.match(/\/brand\/([^/]+)\/?/);
      if (slugMatch) slug = slugMatch[1].toLowerCase();
    }
    if (!slug && name) {
      slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    if (name) {
      rawProviders.push({
        name,
        slug,
        category,
        rank,
        isHot,
        providerUrl: providerUrl || `https://igamingapis.com/brand/${slug}/`,
        logo
      });
    }
  }

  console.log(`Extracted ${rawProviders.length} total provider records from HTML.`);

  // Deduplicate by slug
  const uniqueProvidersMap = new Map();
  rawProviders.forEach(p => {
    if (!uniqueProvidersMap.has(p.slug)) {
      uniqueProvidersMap.set(p.slug, p);
    }
  });

  const providers = Array.from(uniqueProvidersMap.values());
  console.log(`Unique providers count: ${providers.length}`);

  // Sort: Rank 1..10 first, then alphabetically
  providers.sort((a, b) => {
    const ra = a.rank > 0 ? a.rank : 999;
    const rb = b.rank > 0 ? b.rank : 999;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });

  console.log('\nProbing individual provider pages to verify listed game count & accessibility (in parallel batches)...');
  const batchSize = 10;
  for (let i = 0; i < providers.length; i += batchSize) {
    const batch = providers.slice(i, i + batchSize);
    await Promise.all(batch.map(async (p) => {
      const res = await getHtml(p.providerUrl);
      p.httpStatus = res.statusCode;
      if (res.statusCode === 200 && res.html) {
        // Check for agent locked
        const isLocked = res.html.includes('is-agent-locked') || res.html.includes('data-agent-locked="1"');
        p.isAgentLocked = isLocked;
        p.catalogueStatus = isLocked ? 'agent_locked' : 'public_verified';

        // Check for "X Games Available" meta string
        const gamesMatch = res.html.match(/(\d+)\s+Games?\s+Available/i) 
                        || res.html.match(/<span>(\d+)\s+Games?<\/span>/i);
        if (gamesMatch) {
          p.listedGameCount = parseInt(gamesMatch[1], 10);
        } else {
          p.listedGameCount = 0;
        }

        // Look for description if any
        const descMatch = res.html.match(/<div class="brand-desc[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        p.description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      } else {
        p.isAgentLocked = true;
        p.catalogueStatus = `http_${res.statusCode}`;
        p.listedGameCount = 0;
        p.description = '';
      }
    }));
    console.log(`Probed ${Math.min(i + batchSize, providers.length)} / ${providers.length} providers...`);
  }

  // Summary statistics
  const lockedCount = providers.filter(p => p.isAgentLocked).length;
  const publicCount = providers.filter(p => !p.isAgentLocked).length;
  const totalListedGames = providers.reduce((sum, p) => sum + (p.listedGameCount || 0), 0);

  console.log('\n======================================================');
  console.log(`PROVIDER EXTRACTION SUMMARY:`);
  console.log(`Total Extracted Providers: ${providers.length}`);
  console.log(`Publicly Accessible Providers: ${publicCount}`);
  console.log(`Restricted / Agent Code Gate Providers: ${lockedCount}`);
  console.log(`Total Listed Games Count from Provider Headers: ${totalListedGames}`);
  console.log('======================================================\n');

  // Build providers_master.csv
  const masterHeaders = [
    'providerId',
    'providerName',
    'category',
    'rank',
    'isHot',
    'providerUrl',
    'logoUrl',
    'httpStatus',
    'catalogueStatus',
    'isAgentLocked',
    'listedGameCount'
  ];

  const masterRows = providers.map((p, idx) => [
    p.slug || `p-${idx + 1}`,
    p.name,
    p.category,
    p.rank || '',
    p.isHot ? 'TRUE' : 'FALSE',
    p.providerUrl,
    p.logo,
    p.httpStatus,
    p.catalogueStatus,
    p.isAgentLocked ? 'YES' : 'NO',
    p.listedGameCount
  ].map(escapeCsv).join(','));

  const masterCsv = [masterHeaders.join(','), ...masterRows].join('\n');
  fs.writeFileSync(path.join(__dirname, 'reports', 'providers_master.csv'), masterCsv, 'utf8');
  console.log('Saved reports/providers_master.csv');

  // Build restricted_providers.csv
  const restrictedProviders = providers.filter(p => p.isAgentLocked);
  const restrictedHeaders = [
    'providerId',
    'providerName',
    'category',
    'providerUrl',
    'httpStatus',
    'accessRequirement',
    'notes'
  ];
  const restrictedRows = restrictedProviders.map(p => [
    p.slug,
    p.name,
    p.category,
    p.providerUrl,
    p.httpStatus,
    'Agent Code Required (aca_agent_code / acaClickGate)',
    p.listedGameCount > 0 ? `${p.listedGameCount} games registered in header but catalogue locked behind agent gate` : 'Requires authorized API session to inspect catalog'
  ].map(escapeCsv).join(','));

  const restrictedCsv = [restrictedHeaders.join(','), ...restrictedRows].join('\n');
  fs.writeFileSync(path.join(__dirname, 'reports', 'restricted_providers.csv'), restrictedCsv, 'utf8');
  console.log('Saved reports/restricted_providers.csv');

  // Build data/providers.json in recommended schema
  const providersJson = providers.map((p, idx) => ({
    providerId: p.slug || `p-${idx + 1}`,
    name: p.name,
    slug: p.slug,
    logo: p.logo,
    providerUrl: p.providerUrl,
    category: p.category,
    rank: p.rank || null,
    isHot: !!p.isHot,
    gameCount: p.listedGameCount || 0,
    httpStatus: p.httpStatus,
    status: 'active',
    catalogueStatus: p.catalogueStatus
  }));

  fs.writeFileSync(path.join(__dirname, 'data', 'providers.json'), JSON.stringify(providersJson, null, 2), 'utf8');
  console.log('Saved data/providers.json');
}

run().catch(console.error);
