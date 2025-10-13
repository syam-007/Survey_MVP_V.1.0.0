const fs = require('fs');
const path = require('path');

const files = [
  'apps/web/src/components/forms/steps/LocationStep.tsx',
  'apps/web/src/components/forms/steps/DepthStep.tsx',
  'apps/web/src/components/forms/steps/SurveyStep.tsx',
  'apps/web/src/components/forms/steps/TieOnStep.tsx',
  'apps/web/src/components/forms/steps/ReviewStep.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace Grid import with Stack and Box
  content = content.replace(/import.*Grid.*from '@mui\/material';/g, (match) => {
    return match.replace('Grid', 'Stack, Box');
  });

  // Replace Grid container with Stack
  content = content.replace(/<Grid container spacing=\{3\}>/g, '<Stack spacing={3}>');
  content = content.replace(/<\/Grid>/g, (match) => {
    // Only replace closing Grid tags that were containers
    return '</Stack>';
  });

  // Replace Grid item patterns with Box wrappers
  content = content.replace(/<Grid item xs=\{12\} sm=\{6\}>/g, '<Box sx={{ flex: 1 }}>');
  content = content.replace(/<Grid item xs=\{12\}>/g, '<Box>');

  fs.writeFileSync(file, content);
  console.log(`Fixed: ${file}`);
});

console.log('Done!');
