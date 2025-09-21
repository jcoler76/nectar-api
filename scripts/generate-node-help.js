/*
  Generates one HTML help page per workflow node from src/features/workflows/nodes/nodeTypes.js
  - Creates docs/help/nodes/<slug>.html using docs/help/templates/node-template.html
  - Emits docs/help/nodes/nodes.json with extracted metadata for reuse
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NODE_TYPES_FILE = path.join(__dirname, '..', 'src', 'features', 'workflows', 'nodes', 'nodeTypes.js');
const TEMPLATE_FILE = path.join(__dirname, '..', 'docs', 'help', 'templates', 'node-template.html');
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'help', 'nodes');
const SCREENSHOT_DIR = path.join(__dirname, '..', 'docs', 'help', 'assets', 'screenshots');

function readFileSafe(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeFileEnsured(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function extractNodeDefs(fileText) {
  // Strip imports and type/JSX specific lines we don't need
  let src = fileText
    .split(/\r?\n/)
    .filter(l => !/^\s*import\s+/.test(l))
    .join('\n');
  // Cut off helpers after node types if present
  const cutIdx = src.indexOf('export const getNodeDefinition');
  if (cutIdx !== -1) src = src.slice(0, cutIdx);
  // Normalize icon/getter fields to harmless stubs
  src = src
    .replace(/icon:\s*[^,]+,/g, 'icon: null,')
    .replace(/getPropertiesComponent:\s*\([^)]*\)\s*=>\s*[^,}]+/g, 'getPropertiesComponent: () => null');
  // Convert export to assignable var and export via module.exports
  src = src.replace(/export\s+const\s+NODE_TYPES\s*=\s*\{/, 'var NODE_TYPES = {');
  src += '\nmodule.exports = { NODE_TYPES };\n';

  const sandbox = { module: { exports: {} } };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { timeout: 2000 });
  const obj = sandbox.module.exports.NODE_TYPES || {};

  // Transform object map into array of metadata
  const out = Object.keys(obj).map(k => {
    const v = obj[k] || {};
    const keys = [];
    const dd = v.defaultData || {};
    if (dd && typeof dd === 'object') {
      Object.keys(dd).forEach(key => keys.push(key));
    }
    return {
      type: v.type || k,
      name: v.name || k,
      description: v.description || '',
      category: v.category || 'unknown',
      defaultDataKeys: Array.from(new Set(keys)),
    };
  });
  return out.filter(n => n.category && n.category !== 'system');
}

function renderTemplate(tpl, ctx) {
  return tpl
    .replaceAll('{{TITLE}}', ctx.title)
    .replaceAll('{{CATEGORY}}', ctx.category)
    .replaceAll('{{TYPE}}', ctx.type)
    .replaceAll('{{DESCRIPTION}}', ctx.description || '')
    .replaceAll('{{OVERVIEW}}', ctx.overview || ctx.description || '')
    .replaceAll('{{WHEN_TO_USE_ITEMS}}', ctx.whenToUseItems.join('\n'))
    .replaceAll('{{SETUP_STEPS}}', ctx.setupSteps.join('\n'))
    .replaceAll('{{CONFIG_CARDS}}', ctx.configCards.join('\n'))
    .replaceAll('{{EXAMPLE_JSON}}', ctx.exampleJson)
    .replaceAll('{{SLUG}}', ctx.slug)
    .replaceAll('{{RELATED_NODES}}', ctx.relatedNodes.join('\n'));
}

function buildConfigCards(keys) {
  if (!keys || keys.length === 0) return [
    '<div class="card"><strong>No default configuration keys detected.</strong><br/><span class="muted">This node may use dynamic configuration.</span></div>'
  ];
  return keys.slice(0, 20).map(k => `
    <div class="card">
      <div><strong>${k}</strong></div>
      <div class="muted">Describe how to set <code>${k}</code>.</div>
    </div>
  `);
}

function main() {
  const nodeTypesText = readFileSafe(NODE_TYPES_FILE);
  const template = readFileSafe(TEMPLATE_FILE);

  const nodes = extractNodeDefs(nodeTypesText);
  const relatedByCategory = nodes.reduce((acc, n) => {
    (acc[n.category] ||= []).push(n);
    return acc;
  }, {});

  const manifest = [];

  nodes.forEach(n => {
    const title = n.name || n.type;
    const slug = slugify(n.type);
    const example = {
      type: n.type,
      name: n.name,
      config: n.defaultDataKeys?.reduce((o, k) => { o[k] = '...'; return o; }, {}) || {},
    };

    const ctx = {
      title,
      category: n.category,
      type: n.type,
      description: n.description || '',
      overview: n.description || '',
      whenToUseItems: [
        `<li>Include <strong>${title}</strong> when ${n.category === 'triggers' ? 'initiating a workflow from an external event' : n.category === 'logic' ? 'branching or controlling execution flow' : 'integrating with an external system or performing an action'}.</li>`,
        `<li>Combine with complementary nodes for complete flows (see Related Nodes).</li>`,
      ],
      setupSteps: [
        `<li>Open the Workflow Builder and click <span class=\"kbd\">Add Node</span>.</li>`,
        `<li>Select <strong>${title}</strong> from the ${n.category} category.</li>`,
        `<li>Fill out required configuration fields.</li>`,
        `<li>Connect inputs/outputs to adjacent nodes and save.</li>`,
      ],
      configCards: buildConfigCards(n.defaultDataKeys || []),
      exampleJson: JSON.stringify(example, null, 2),
      slug,
      relatedNodes: (relatedByCategory[n.category] || [])
        .filter(r => r.type !== n.type)
        .slice(0, 6)
        .map(r => `<li>${r.name || r.type} <span class=\"muted\">(${r.type})</span></li>`),
    };

    const html = renderTemplate(template, ctx);
    const outPath = path.join(OUTPUT_DIR, `${slug}.html`);
    writeFileEnsured(outPath, html);
    manifest.push({ slug, ...n, title });

    // Create placeholder transparent PNGs if not present
    const placeholders = [ `${slug}-doc.png`, `${slug}-panel.png` ];
    placeholders.forEach(fn => {
      const fp = path.join(SCREENSHOT_DIR, fn);
      if (!fs.existsSync(fp)) {
        fs.mkdirSync(path.dirname(fp), { recursive: true });
        // 1x1 transparent PNG
        const png1x1 = Buffer.from(
          '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C636000000200015C0BF2160000000049454E44AE426082',
          'hex'
        );
        fs.writeFileSync(fp, png1x1);
      }
    });
  });

  // Write manifest for reuse (e.g., Playwright)
  writeFileEnsured(path.join(OUTPUT_DIR, 'nodes.json'), JSON.stringify(manifest, null, 2));

  console.log(`Generated ${manifest.length} node help files in ${path.relative(process.cwd(), OUTPUT_DIR)}`);
}

if (require.main === module) {
  main();
}
