const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const exts = ['.js', '.jsx', '.ts', '.tsx'];

function walk(dir) {
  let res = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
      res = res.concat(walk(full));
    } else {
      if (exts.includes(path.extname(name))) res.push(full);
    }
  }
  return res;
}

function findLocals(content) {
  const locals = [];
  // simple regex for const/let/var declarations
  const varRegex = /(?:^|[^\w$])(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = varRegex.exec(content)) !== null) {
    locals.push({name: m[1], index: m.index});
  }
  // function declarations
  const fnRegex = /(?:^|[^\w$])function\s+([A-Za-z_$][\w$]*)/g;
  while ((m = fnRegex.exec(content)) !== null) {
    locals.push({name: m[1], index: m.index});
  }
  // catch arrow-assigned names: const foo = ( , const foo = async ( , const foo = (param) =>
  const arrowRegex = /(?:^|[^\w$])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?[A-Za-z0-9_\(\[`"'\/]/g;
  while ((m = arrowRegex.exec(content)) !== null) {
    if (!locals.find(l => l.name === m[1])) locals.push({name: m[1], index: m.index});
  }
  return locals;
}

function detectUnusedLocals(file) {
  const content = fs.readFileSync(file,'utf8');
  // skip files that export symbols (likely used elsewhere)
  if (/\bexport\b|module\.exports/.test(content)) return {file, unused: []};
  const locals = findLocals(content);
  const unused = [];
  for (const l of locals) {
    const re = new RegExp('\\b'+l.name+'\\b','g');
    let count = 0;
    let m;
    while ((m = re.exec(content)) !== null) count++;
    if (count <= 1) { // only declaration occurrence
      // avoid catching React lifecycle names and common hooks
      if (['props','state','setState','require','module','exports'].includes(l.name)) continue;
      unused.push({name: l.name});
    }
  }
  return {file, unused};
}

const targetDirs = ['client/src','server/src'];
const files = [];
for (const d of targetDirs) {
  const p = path.join(root,d);
  if (fs.existsSync(p)) files.push(...walk(p));
}

const out = [];
for (const f of files) {
  try{
    const r = detectUnusedLocals(f);
    if (r.unused.length) out.push(r);
  }catch(e){
    console.error('ERR',f,e.message);
  }
}
fs.writeFileSync(path.join(root,'tools','scan_locals_report.json'), JSON.stringify(out, null, 2));
console.log('Local-scan complete. Report at tools/scan_locals_report.json');
