// Bundle Analysis - Top 5 Largest Chunks
const chunkMapping = {
  '921': 'Likely: Third-party libraries (React, Material-UI, etc.)',
  'main': 'Application entry point and core components',
  '967': 'Likely: Large UI library or data visualization (ReactFlow, Charts)',
  '869': 'Likely: Form libraries or data processing utilities',
  '900': 'Likely: Additional third-party dependencies'
};

console.log('🎯 Bundle Analysis - Top 5 Largest Chunks:');
console.log('================================================');

const chunks = [
  { name: '921.js', size: '544.43 kB', raw: 1847913 },
  { name: 'main.js', size: '356.11 kB', raw: 1790797 },
  { name: '967.js', size: '225.68 kB', raw: 639204 },
  { name: '869.js', size: '142.86 kB', raw: 526968 },
  { name: '900.js', size: '106.33 kB', raw: 394393 }
];

chunks.forEach((chunk, i) => {
  const chunkNum = chunk.name.split('.')[0];
  console.log(`${i+1}. ${chunk.name} - ${chunk.size} gzipped (${(chunk.raw/1024/1024).toFixed(2)}MB uncompressed)`);
  console.log(`   ${chunkMapping[chunkNum] || 'Unknown content - needs investigation'}`);
  console.log('');
});

const totalTop5 = chunks.reduce((sum, chunk) => sum + parseFloat(chunk.size), 0);
console.log(`Total of top 5 chunks: ${totalTop5.toFixed(2)} kB (${(totalTop5/1850*100).toFixed(1)}% of total 1.85MB)`);