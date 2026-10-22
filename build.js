const fs = require('fs');
const { minify } = require('html-minifier-terser');
const CleanCSS = require('clean-css');

const SRC = 'src';
const DIST = 'dist';

let html = fs.readFileSync(`${SRC}/index.html`, 'utf8');
let css = fs.readFileSync(`${SRC}/style.css`, 'utf8');

css = css.replace(/\/\*[\s\S]*?\*\//g, '');

const saved = [];
css = css.replace(/url\([^)]*\)|"[^"]*"|'[^']*'/g, m => {
  saved.push(m);
  return `__P${saved.length - 1}__`;
});

const classRe = /\.([a-zA-Z_][\w-]*)/g;
const classes = [...new Set([...css.matchAll(classRe)].map(m => m[1]))];

const short = i => {
  let s = '';
  i++;
  while (i > 0) {
    i--;
    s = String.fromCharCode(97 + (i % 26)) + s;
    i = Math.floor(i / 26);
  }
  return '_' + s;
};
const map = Object.fromEntries(classes.map((c, i) => [c, short(i)]));

css = css.replace(classRe, (m, c) => '.' + (map[c] || c));
css = css.replace(/__P(\d+)__/g, (m, i) => saved[i]);

html = html.replace(/class=(["'])([^"']*)\1/g, (m, q, list) =>
  `class=${q}${list.split(/\s+/).filter(Boolean).map(c => map[c] || c).join(' ')}${q}`
);

(async () => {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  fs.writeFileSync(`${DIST}/style.css`, new CleanCSS({ level: 2 }).minify(css).styles);

  fs.writeFileSync(`${DIST}/index.html`, await minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true
  }));

  if (fs.existsSync(`${SRC}/static`)) {
    fs.cpSync(`${SRC}/static`, `${DIST}/static`, { recursive: true });
  }

  console.log('Build complete:', Object.keys(map).length, 'classes renamed');
})();