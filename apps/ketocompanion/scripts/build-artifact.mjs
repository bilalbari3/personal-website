// Inlines the `vite build --mode artifact` output into one self-contained HTML page for claude.ai.
// The claude.ai publisher adds the <!doctype>/<html>/<head>/<body> skeleton itself.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist-artifact';
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const css = html.match(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"/)?.[1];
const js = html.match(/<script type="module"[^>]*src="\.\/([^"]+)"/)?.[1];
if (!css || !js) throw new Error('Could not find the built CSS/JS in dist-artifact/index.html');

const style = readFileSync(join(dir, css), 'utf8');
const script = readFileSync(join(dir, js), 'utf8').replace(/<\/script/gi, '<\\/script');

const page = `<title>KetoCompanion</title>
<meta name="theme-color" content="#226f67">
<style>
${style}
</style>
<div id="root"></div>
<script type="module">
${script}
</script>
`;
const out = join(dir, 'ketocompanion.html');
writeFileSync(out, page);
console.log(`Wrote ${out} (${(page.length / 1024).toFixed(0)} kB)`);
