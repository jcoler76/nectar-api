/*
 Generate Blueprints SDK locally without needing the server running.
 1) Builds OpenAPI spec using the same code as the route.
 2) Writes spec to server/openapi-blueprints.json
 3) Invokes openapi-generator-cli to generate TypeScript SDK to artifacts/sdk/blueprints/typescript
*/

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { buildBlueprintsOpenAPI } = require('../routes/documentationBlueprints');

async function main() {
  // Build spec using a fake req with base URL
  const fakeReq = {
    protocol: process.env.SDK_BASE_PROTOCOL || 'http',
    get: h => (h === 'host' ? process.env.SDK_BASE_HOST || 'localhost:3001' : ''),
  };

  // Ensure blueprints are enabled for spec comprehensiveness
  if ((process.env.BLUEPRINTS_ENABLED || 'false').toLowerCase() !== 'true') {
    console.warn(
      'BLUEPRINTS_ENABLED is not true; spec will still be generated but endpoints may return 404 at runtime.'
    );
  }

  const spec = buildBlueprintsOpenAPI(fakeReq);
  const specPath = path.resolve(__dirname, '..', 'openapi-blueprints.json');
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2), 'utf8');
  console.log(`Wrote ${specPath}`);

  // Attempt to run generator
  const outDir = path.join(process.cwd(), 'artifacts', 'sdk', 'blueprints', 'typescript');
  fs.mkdirSync(outDir, { recursive: true });

  const cliPath =
    process.env.OPENAPI_GENERATOR_CLI ||
    path.join(process.cwd(), 'node_modules', '.bin', 'openapi-generator-cli');
  const args = ['generate', '-i', specPath, '-g', 'typescript-axios', '-o', outDir];
  console.log(`Running: ${cliPath} ${args.join(' ')}`);

  await new Promise(resolve => {
    const child = spawn(cliPath, args, { stdio: 'inherit', shell: true });
    child.on('close', code => {
      if (code === 0) {
        console.log('SDK generation completed:', outDir);
      } else {
        console.warn(
          'SDK generation failed (is Java installed?). You can still use Docker per docs.'
        );
      }
      resolve();
    });
  });
}

main().catch(err => {
  console.error('Generation script error:', err);
  process.exit(1);
});
