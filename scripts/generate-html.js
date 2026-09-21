import fs from 'fs';
import path from 'path';

const clientDir = path.resolve('dist/client');
const assetsDir = path.join(clientDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('Assets directory not found');
  process.exit(1);
}

const assets = fs.readdirSync(assetsDir);
const cssFile = assets.find(f => f.endsWith('.css'));
const jsFile = assets.find(
  (f) =>
    f.startsWith('index-') &&
    f.endsWith('.js') &&
    fs.readFileSync(path.join(assetsDir, f), 'utf8').includes('createRoot')
);

if (!cssFile || !jsFile) {
  console.error('CSS or JS bundle not found', { cssFile, jsFile });
  process.exit(1);
}

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hacienda Guayaba Lorente - Ganadería de Alta Genética</title>
    <link rel="stylesheet" href="/assets/${cssFile}">
</head>
<body class="bg-gray-50 text-gray-900 antialiased">
    <div id="root"></div>
    <script type="module" src="/assets/${jsFile}"></script>
</body>
</html>`;

fs.writeFileSync(path.join(clientDir, 'index.html'), htmlContent, 'utf8');
console.log('Successfully generated dist/client/index.html with', { cssFile, jsFile });
