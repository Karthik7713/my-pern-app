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

function findImports(content) {
  const lines = content.split('\n');
  const imports = [];
  const importRegex = /^\s*import\s+(.*)\s+from\s+['"](.*)['"];?/;
  const importAllRegex = /^\s*import\s+['"](.*)['"];?/;
  for (let i=0;i<lines.length;i++){
    const line = lines[i];
    let m = line.match(importRegex);
    if (m){
      imports.push({line:i+1, raw:line, spec: m[1], from: m[2]});
      continue;
    }
    m = line.match(importAllRegex);
    if (m){
      imports.push({line:i+1, raw:line, spec: null, from: m[1]});
    }
  }
  return imports;
}

function detectUnusedInFile(file) {
  const content = fs.readFileSync(file,'utf8');
  const imports = findImports(content);
  const results = [];
  for (const imp of imports) {
    if (!imp.spec) continue; // side-effect import, keep
    // parse spec
    const spec = imp.spec.trim();
    // handle default + named: e.g. React, {useState, useEffect} or * as utils
    const names = [];
    if (spec.startsWith('{')) {
      // named only
      const inner = spec.replace(/^{|}$/g,'');
      inner.split(',').map(s=>s.trim()).forEach(s=>{ const n = s.split(' as ')[0].trim(); if(n) names.push(n);});
    } else if (spec.includes('{')) {
      // default + named
      const parts = spec.split('{');
      const def = parts[0].replace(',','').trim();
      if(def) names.push(def);
      const inner = parts[1].replace(/}.*$/,'');
      inner.split(',').map(s=>s.trim()).forEach(s=>{ const n = s.split(' as ')[0].trim(); if(n) names.push(n);});
    } else if (spec.startsWith('*')) {
      // namespace import: * as utils
      const m = spec.match(/\*\s+as\s+(\w+)/);
      if (m) names.push(m[1]);
    } else {
      // default only
      names.push(spec);
    }

    const unused = [];
    for (const name of names) {
      // search for word occurrence beyond the import line
      const re = new RegExp('\\b'+name+'\\b');
      const lines = content.split('\n');
      let found = false;
      for (let i=0;i<lines.length;i++){
        if (i === imp.line-1) continue;
        if (re.test(lines[i])) { found = true; break; }
      }
      if (!found) unused.push(name);
    }
    if (unused.length>0) results.push({file, line: imp.line, from: imp.from, spec: imp.spec, unused});
  }

  // find big commented blocks (/* ... */) with code-like content
  const commentBlocks = [];
  const blockRegex = /\/\*[\s\S]*?\*\//g;
  let m;
  while ((m = blockRegex.exec(content)) !== null) {
    const txt = m[0];
    const lines = txt.split('\n');
    if (lines.length >= 5) {
      // heuristic: contains code keywords
      if (/\b(function|const|let|var|return|=>|class)\b/.test(txt)) commentBlocks.push({start: m.index, length: txt.length});
    }
  }

  // also repeated single-line comments blocks
  const singleLines = content.split('\n');
  let seq = null;
  for (let i=0;i<singleLines.length;i++){
    if (/^\s*\/\//.test(singleLines[i])){
      if (!seq) seq = {start:i, len:1, text: singleLines[i]}; else seq.len++;
    } else {
      if (seq && seq.len>=5){
        // check if contains code-like
        const slice = singleLines.slice(seq.start, seq.start+seq.len).join('\n');
        if (/\b(function|const|let|var|return|=>|class)\b/.test(slice)) commentBlocks.push({startLine: seq.start+1, lines: seq.len});
      }
      seq = null;
    }
  }

  return {file, unusedImports: results, commentBlocks};
}

const files = walk(root);
const out = [];
for (const f of files) {
  try{
    out.push(detectUnusedInFile(f));
  }catch(e){
    console.error('ERR',f,e.message);
  }
}
fs.writeFileSync(path.join(root,'tools','scan_unused_report.json'), JSON.stringify(out, null, 2));
console.log('Scan complete. Report at tools/scan_unused_report.json');
