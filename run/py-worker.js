// Python runs here, off the main thread.
//
// Two things this buys that the main thread cannot: input() can actually block
// and wait for a keystroke, and a student's infinite loop can be interrupted
// instead of freezing the tab.
//
// Must be a MODULE worker. Pyodide 314 cannot be loaded with importScripts.

const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v314.0.3/full/';

// Start the import but do NOT await it out here. A top-level await delays the
// assignment of self.onmessage below, and the init message the page posts right
// after new Worker() then arrives with no handler to receive it and is dropped.
// That only shows up when the module is a cache miss, which makes it exactly the
// kind of race that survives testing and breaks on someone's first visit.
const pyodideReady = import(PYODIDE + 'pyodide.mjs');

let py = null;
let ROOT = '';
let ctl = null;    // Int32Array: [0] stdin state, [1] byte length
let buf = null;    // Uint8Array: the typed line, UTF-8

const send = (m) => postMessage(m);

/* ---------- stdout ----------
   Line buffering is wrong here. input("A noun: ") writes a prompt with no
   newline, so a line-buffered stream holds it until after the answer is typed
   and the student is asked a question they cannot see. Output is accumulated
   and flushed on a short timer, and always flushed before blocking on stdin. */
let outBuf = '', outTimer = null;
const decoder = new TextDecoder('utf-8');

function flushOut(){
  if(outTimer){ clearTimeout(outTimer); outTimer = null; }
  if(outBuf){ send({ type:'out', text: outBuf }); outBuf = ''; }
}
function pushOut(text){
  outBuf += text;
  if(outBuf.length > 8192) return flushOut();
  if(!outTimer) outTimer = setTimeout(flushOut, 16);
}

/* ---------- stdin ----------
   Blocks the worker until the main thread supplies a line. Only possible
   because this is not the main thread and the page is cross-origin isolated.
   State 1 means a line is waiting, 2 means end of input. */
function blockingStdin(){
  flushOut();                       // the prompt must be on screen first
  Atomics.store(ctl, 0, 0);
  send({ type:'stdin:want' });
  Atomics.wait(ctl, 0, 0);
  if(Atomics.load(ctl, 0) === 2) return null;
  return new TextDecoder().decode(buf.slice(0, Atomics.load(ctl, 1)));
}

/* ---------- filesystem ----------
   The main thread cannot touch py.FS across a worker boundary, so every
   operation it needs is a message. Walking and batch writing stay here on
   purpose: doing them a file at a time would be hundreds of round trips. */
const stat = (p) => { try{ const m = py.FS.stat(p).mode; return { dir: py.FS.isDir(m), file: py.FS.isFile(m) }; }catch{ return null; } };

// work/ ships a starter file per exercise. Those are course files, not student
// work, so they are held aside and anything still identical to its starter is
// skipped. See the note in run/index.html.
let PRISTINE = {};

function collectWork(){
  const store = {};
  (function walk(dir){
    let names = [];
    try{ names = py.FS.readdir(dir); }catch{ return; }
    for(const n of names){
      if(n === '.' || n === '..') continue;
      const full = dir + '/' + n;
      const s = stat(full);
      if(!s) continue;
      if(s.dir){ walk(full); continue; }
      const key = full.slice(ROOT.length + 1);
      try{
        const content = py.FS.readFile(full, { encoding:'utf8' });
        if(PRISTINE[key] !== content) store[key] = content;
      }catch{}
    }
  })(ROOT + '/work');
  return store;
}

function restoreWork(files){
  let n = 0;
  for(const [p, content] of Object.entries(files || {})){
    if(!p.startsWith('work/')) continue;
    const full = ROOT + '/' + p;
    try{
      py.FS.mkdirTree(full.slice(0, full.lastIndexOf('/')));
      py.FS.writeFile(full, content);
      n++;
    }catch{}
  }
  return n;
}

const PRELUDE = (root) => `
import sys, os, runpy, traceback
sys.path.insert(0, '${root}/code/src')
os.chdir('${root}')

def _aifw_run_module(mod, argv):
    sys.argv = [mod] + argv
    try:
        runpy.run_module(mod, run_name='__main__', alter_sys=True)
    except SystemExit as e:
        code = e.code
        if isinstance(code, str):
            print(code)
            raise SystemExit(1)
        raise SystemExit(int(code or 0))

def _aifw_run_path(path, argv):
    sys.argv = [path] + argv
    try:
        runpy.run_path(path, run_name='__main__')
    except SystemExit as e:
        raise SystemExit(int(e.code or 0)) if not isinstance(e.code, str) else SystemExit(1)
`;

const OPS = {
  list(p){
    const s = stat(p);
    if(!s) return { kind:'missing' };
    if(s.file) return { kind:'file' };
    const names = py.FS.readdir(p).filter(n => n !== '.' && n !== '..').sort();
    return { kind:'dir', entries: names.map(n => ({ name:n, dir: !!(stat(p + '/' + n) || {}).dir })) };
  },
  stat(p){ return stat(p); },
  read(p){
    const s = stat(p);
    if(!s || !s.file) return { ok:false };
    return { ok:true, content: py.FS.readFile(p, { encoding:'utf8' }) };
  },
  write(p, content){
    py.FS.mkdirTree(p.slice(0, p.lastIndexOf('/')));
    py.FS.writeFile(p, content);
    return { ok:true };
  },
  collect(){ return { files: collectWork() }; },
  restore(files){ return { written: restoreWork(files) }; },
};

self.onmessage = async (e) => {
  const msg = e.data;

  if(msg.type === 'init'){
    ROOT = msg.root;
    if(msg.sab){
      ctl = new Int32Array(msg.sab, 0, 2);
      buf = new Uint8Array(msg.sab, 8);
    }
    try{
      send({ type:'stage', text:'Loading Python ' });
      const { loadPyodide } = await pyodideReady;
      py = await loadPyodide({ indexURL: PYODIDE });
      py.setStdout({ write: (b) => { pushOut(decoder.decode(b, { stream:true })); return b.length; } });
      py.setStderr({ batched: (t) => { flushOut(); send({ type:'out', text: t + '\n', err:true }); } });

      // autoEOF stops Pyodide reading ahead. Without it the first input() would
      // be asked to produce every line the program will ever read.
      if(ctl) py.setStdin({ stdin: blockingStdin, isatty:true, autoEOF:true });
      else    py.setStdin({ stdin: () => null });

      if(msg.interrupt) py.setInterruptBuffer(msg.interrupt);
      send({ type:'stage', text:'ok\n', dim:true });

      send({ type:'stage', text:'Loading the course ' });
      const res = await fetch(msg.bundleUrl);
      if(!res.ok) throw new Error('could not load the course files (' + res.status + ')');
      const bundle = await res.json();
      py.FS.mkdirTree(ROOT);
      for(const [p, content] of Object.entries(bundle.files)){
        const full = ROOT + '/' + p;
        py.FS.mkdirTree(full.slice(0, full.lastIndexOf('/')));
        py.FS.writeFile(full, content);
        if(p.startsWith('work/')) PRISTINE[p] = content;
      }

      // The course ships a START_HERE.md written for someone who downloaded it:
      // install Python, open a terminal, add it to PATH. That is correct there
      // and wrong here, and it is the first thing the terminal tells a visitor
      // to read, so it was sending people away before they started. Swap in a
      // browser version. The course repos keep theirs untouched.
      if(msg.startHere){
        try{
          const sh = await fetch(msg.startHere);
          if(sh.ok){
            py.FS.writeFile(ROOT + '/START_HERE.md', (await sh.text())
              .replaceAll('{{TITLE}}', msg.title || '')
              .replaceAll('{{PKG}}', msg.pkg || '')
              .replaceAll('{{FIRST}}', msg.first || ''));
          }
        }catch(err){
          console.warn('browser START_HERE unavailable:', err.message);
        }
      }
      await py.runPythonAsync(PRELUDE(ROOT));

      // urllib opens raw TCP sockets, which WASM does not have, so week 9 of
      // py-skool could not call an API at all. pyodide_http re-points urllib at
      // the browser's own HTTP stack. Whether a given response can then be read
      // is down to CORS at the far end; api.github.com, which is what the course
      // actually calls, allows it. Best effort: a CDN hiccup here should cost
      // network access, not the whole terminal.
      let net = false;
      try{
        await py.loadPackage('pyodide-http');
        await py.runPythonAsync('import pyodide_http; pyodide_http.patch_all()');
        net = true;
      }catch(err){
        console.warn('pyodide-http unavailable:', err.message);
      }

      send({ type:'ready', files: Object.keys(bundle.files).length, stdin: !!ctl, net });
    }catch(err){
      send({ type:'failed', error: String(err.message || err) });
    }
    return;
  }

  if(msg.type === 'fs'){
    try{ send({ type:'reply', id: msg.id, ok:true, value: OPS[msg.op](...msg.args) }); }
    catch(err){ send({ type:'reply', id: msg.id, ok:false, error: String(err.message || err) }); }
    return;
  }

  if(msg.type === 'run'){
    let code = 0, error = null;
    try{
      await py.runPythonAsync(msg.code);
      flushOut();
    }catch(err){
      flushOut();
      const text = String(err.message || err);
      const m = text.match(/SystemExit:\s*(\d+)/);
      if(m) code = Number(m[1]);
      else { code = 1; error = text; }
    }
    send({ type:'reply', id: msg.id, ok:true, value:{ code, error } });
  }
};
