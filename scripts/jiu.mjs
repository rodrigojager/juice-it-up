#!/usr/bin/env node
// juice-it-up: durable workflow state. The controller is the only writer of the
// main state; the lab only writes events to events/inbox/.
// No dependencies: only Node native modules (>= 18).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHASES = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'closed'];
const DECISIONS = ['undecided', 'preview', 'rejected', 'deferred', 'implement'];
const OPP_STATES = ['open', 'deferred', 'dismissed', 'closed'];
const WORK = ['proposed', 'mock-building', 'mock-ready', 'review-requested', 'implementing', 'implemented', 'verified', 'blocked', 'stale'];
const STALEABLE = ['proposed', 'mock-building', 'mock-ready', 'review-requested', 'blocked'];
const EVENT_TYPES = ['comment', 'prefer', 'reject', 'defer', 'adjust'];
const DEFAULT_LIMITS = {
  surfaces: [],
  maxOpportunities: 5,
  maxSeasonalOpportunities: 3,
  maxVariantsPerOpportunity: 3,
  maxConcurrentPreviews: 4,
  reviewRounds: 2,
  maxChangesPerBatch: 3,
  allowedDependencies: [],
};
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.juice-it-up', '.turbo', '.cache']);

// ---------- utilities ----------

class CliError extends Error {
  constructor(msg, code = 1) { super(msg); this.code = code; }
}
const die = (msg, code = 1) => { throw new CliError(msg, code); };
const now = () => new Date().toISOString();
const pad = (n, w) => String(n).padStart(w, '0');

function parseArgs(argv) {
  const pos = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const key = t.slice(2);
      const vals = [];
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) vals.push(argv[++i]);
      opts[key] = vals.length === 0 ? true : vals.length === 1 ? vals[0] : vals;
    } else pos.push(t);
  }
  return { pos, opts };
}

const asList = (v) => (v === undefined || v === true ? [] : Array.isArray(v) ? v : [v]);
const str = (v) => (v === undefined || v === true ? undefined : Array.isArray(v) ? v.join(' ') : v);

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { die(`Could not read ${file}: ${e.message}`); }
}

function writeJSON(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

function sha256(buf) { return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex'); }

function walk(p, out, base) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(p).sort()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(path.join(p, name), out, base);
    }
  } else out.push(p);
}

function hashPaths(paths, base) {
  const h = crypto.createHash('sha256');
  const missing = [];
  for (const rel of [...paths].sort()) {
    const abs = path.resolve(base, rel);
    if (!fs.existsSync(abs)) { missing.push(rel); h.update(`missing:${rel}\n`); continue; }
    const files = [];
    walk(abs, files, base);
    for (const f of files) {
      h.update(path.relative(base, f).split(path.sep).join('/') + '\n');
      h.update(fs.readFileSync(f));
    }
  }
  return { hash: 'sha256:' + h.digest('hex'), missing };
}

function gitInfo(dir) {
  if (!dir) return null;
  const git = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    return { head: git('rev-parse', 'HEAD'), branch: git('rev-parse', '--abbrev-ref', 'HEAD'), dirty: git('status', '--porcelain').length > 0 };
  } catch { return null; }
}

const normUrl = (u) => (u ? u.trim().replace(/\/+$/, '') : undefined);
const normPath = (p) => (p ? path.resolve(p) : undefined);

// ---------- state location ----------

function stateDir(opts) {
  return path.resolve(str(opts.state) || process.env.JIU_STATE || '.juice-it-up');
}

function runPath(opts, id) {
  if (!id) die('Provide the run ID (e.g. R-001).');
  const dir = path.join(stateDir(opts), 'runs', id);
  if (!fs.existsSync(path.join(dir, 'run.json'))) die(`Run ${id} not found in ${path.dirname(dir)}.`);
  return dir;
}

function load(dir) {
  return { run: readJSON(path.join(dir, 'run.json')), opps: readJSON(path.join(dir, 'opportunities.json')) };
}

function save(dir, { run, opps }) {
  run.updated = now();
  writeJSON(path.join(dir, 'run.json'), run);
  if (opps) writeJSON(path.join(dir, 'opportunities.json'), opps);
}

function log(dir, entry) {
  fs.appendFileSync(path.join(dir, 'decisions.jsonl'), JSON.stringify({ ts: now(), ...entry }) + '\n');
}

function listRuns(opts) {
  const root = path.join(stateDir(opts), 'runs');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root)
    .filter((n) => /^R-\d+$/.test(n) && fs.existsSync(path.join(root, n, 'run.json')))
    .sort()
    .map((n) => ({ dir: path.join(root, n), run: readJSON(path.join(root, n, 'run.json')) }));
}

// ---------- references O-01/V2/r3 ----------

function parseRef(ref) {
  const m = /^(O-\d+)(?:\/(V\d+)(?:\/r(\d+))?)?$/.exec(String(ref || '').trim());
  if (!m) die(`Invalid reference "${ref}". Use O-01, O-01/V2 or O-01/V2/r3.`);
  return { opp: m[1], variant: m[2], rev: m[3] ? Number(m[3]) : undefined };
}

function resolve(opps, ref, { needRev = false } = {}) {
  const r = parseRef(ref);
  const opp = opps.opportunities.find((o) => o.id === r.opp);
  if (!opp) die(`Opportunity ${r.opp} does not exist in this run.`);
  if (!r.variant) return { opp };
  const variant = opp.variants.find((v) => v.id === r.variant);
  if (!variant) die(`Variant ${r.opp}/${r.variant} does not exist.`);
  if (r.rev === undefined) {
    if (needRev) die(`Ambiguous reference "${ref}": give the exact revision (e.g.: ${r.opp}/${r.variant}/r${variant.revisions.at(-1).rev}).`);
    return { opp, variant };
  }
  const revision = variant.revisions.find((x) => x.rev === r.rev);
  if (!revision) die(`Revision ${ref} does not exist (latest: r${variant.revisions.at(-1).rev}).`);
  return { opp, variant, revision };
}

const refOf = (opp, variant, revision) => `${opp.id}/${variant.id}/r${revision.rev}`;

function allRevisions(opps) {
  const out = [];
  for (const opp of opps.opportunities)
    for (const variant of opp.variants)
      for (const revision of variant.revisions) out.push({ opp, variant, revision, ref: refOf(opp, variant, revision) });
  return out;
}

// ---------- commands ----------

const commands = {};

commands.init = ({ opts }) => {
  const url = normUrl(str(opts.url));
  const code = normPath(str(opts.code));
  if (!url && !code) die('Provide --url, --code or both.');
  if (code && !fs.existsSync(code)) die(`Code path does not exist: ${code}`);
  const existing = listRuns(opts).filter(({ run }) =>
    run.phase !== 'closed' && normUrl(run.target.url) === url && normPath(run.target.code) === code);
  if (existing.length && !opts.new) {
    for (const { run } of existing) console.log(`EXISTING_RUN ${run.id} phase=${run.phase} next="${run.nextAction}"`);
    console.log('Resume the existing run, or repeat with --new to create another.');
    return 2;
  }
  const root = path.join(stateDir(opts), 'runs');
  fs.mkdirSync(root, { recursive: true });
  const nums = listRuns(opts).map(({ run }) => Number(run.id.slice(2)));
  const id = `R-${pad((nums.length ? Math.max(...nums) : 0) + 1, 3)}`;
  const dir = path.join(root, id);
  for (const d of ['evidence', 'proposals/_drafts', 'previews', 'tasks', 'reviews', 'assets', 'events/inbox', 'events/processed'])
    fs.mkdirSync(path.join(dir, d), { recursive: true });
  const run = {
    schema: 'juice-it-up/run@1',
    id,
    title: str(opts.title) || url || path.basename(code),
    created: now(),
    updated: now(),
    mode: url && code ? 'both' : url ? 'url' : 'code',
    target: { url, code, git: gitInfo(code), deployedVersion: undefined, urlSnapshotHash: undefined },
    phase: 'E0',
    nextAction: 'E1 — reconnaissance',
    limits: { ...DEFAULT_LIMITS },
    capabilities: { subagents: null, browser: null, higgsfield: null, git: !!gitInfo(code) },
    authorizations: { media: { authorized: false, limit: 0, spent: 0, unit: 'credits' }, publish: false },
    // Seasonal details are opt-in: offered at most once, and only worked on when requested.
    seasonal: { offered: false, requested: false, occasions: [] },
  };
  writeJSON(path.join(dir, 'run.json'), run);
  writeJSON(path.join(dir, 'opportunities.json'), { schema: 'juice-it-up/opportunities@1', opportunities: [] });
  fs.writeFileSync(path.join(dir, 'tasks', 'tasks.json'), JSON.stringify({ tasks: [] }, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'brief.md'), `# Brief — ${id}\n\n## Target\n- URL: ${url || '—'}\n- Code: ${code || '—'}\n\n## Product and surface goal\n\n## Known audience\n\n## Existing identity (tokens, documentation, DESIGN.md, PRODUCT.md)\n\n## Constraints\n\n## Direction decisions\n`);
  log(dir, { kind: 'init', ref: id, by: 'controller', reason: `target ${url || ''} ${code || ''}`.trim() });
  console.log(`CREATED ${id}`);
  console.log(`DIR ${dir}`);
  return 0;
};

commands.list = ({ opts }) => {
  const url = normUrl(str(opts.url));
  const code = normPath(str(opts.code));
  const runs = listRuns(opts).filter(({ run }) =>
    (!url || normUrl(run.target.url) === url) && (!code || normPath(run.target.code) === code) && (opts.all || run.phase !== 'closed'));
  if (!runs.length) { console.log('No runs found.'); return 0; }
  for (const { run } of runs)
    console.log(`${run.id}  phase=${run.phase}  mode=${run.mode}  target=${run.target.url || ''} ${run.target.code || ''}  updated=${run.updated}\n       next: ${run.nextAction}`);
  return 0;
};

const SETTABLE = /^(phase|nextAction|title|limits\.[A-Za-z]+|capabilities\.[A-Za-z]+|target\.deployedVersion|implementation\.(branch|originalBranch|base)|seasonal\.(offered|requested|occasions)|authorizations\.media\.(authorized|limit|unit)|authorizations\.publish)$/;

commands.set = ({ pos, opts }) => {
  const [id, key, ...rest] = pos;
  const dir = runPath(opts, id);
  if (!SETTABLE.test(key || '')) die(`Key not allowed: ${key}. Allowed: phase, nextAction, title, limits.*, capabilities.*, target.deployedVersion, implementation.{branch,originalBranch,base}, seasonal.{offered,requested,occasions}, authorizations.media.{authorized,limit,unit}, authorizations.publish.`);
  const raw = rest.join(' ');
  let value;
  try { value = JSON.parse(raw); } catch { value = raw; }
  if (key === 'phase' && !PHASES.includes(value)) die(`Invalid phase: ${value}. Use ${PHASES.join(', ')}.`);
  if (['authorizations.publish', 'authorizations.media.authorized', 'seasonal.requested'].includes(key) && value === true && !str(opts.quote))
    die('Authorization requires --quote "<exact words from the user>".');
  const state = load(dir);
  const parts = key.split('.');
  let obj = state.run;
  for (const p of parts.slice(0, -1)) obj = obj[p] ??= {};
  const prev = obj[parts.at(-1)];
  obj[parts.at(-1)] = value;
  save(dir, state);
  log(dir, { kind: 'set', ref: key, from: prev, to: value, by: str(opts.quote) ? 'user' : 'controller', quote: str(opts.quote) });
  console.log(`OK ${key} = ${JSON.stringify(value)}`);
  return 0;
};

commands['opp-add'] = ({ pos, opts }) => {
  const dir = runPath(opts, pos[0]);
  const state = load(dir);
  const { run, opps } = state;
  const title = str(opts.title);
  if (!title) die('Provide --title.');
  const kind = str(opts.kind) || 'standard';
  if (!['standard', 'seasonal'].includes(kind)) die(`Invalid --kind ${kind}. Use standard or seasonal.`);
  const occasion = str(opts.occasion);
  if (kind === 'seasonal') {
    if (!run.seasonal?.requested) die('Seasonal work is opt-in: the user has not asked for it (set seasonal.requested true --quote "<user words>" first).', 3);
    if (!occasion) die('Seasonal opportunities need --occasion (e.g. christmas, halloween, site-anniversary).');
  }
  const max = kind === 'seasonal' ? run.limits.maxSeasonalOpportunities ?? 3 : run.limits.maxOpportunities;
  const active = opps.opportunities.filter((o) => o.state !== 'dismissed' && (o.kind || 'standard') === kind).length;
  if (active >= max && !opts['over-limit'])
    die(`${kind === 'seasonal' ? 'Seasonal opportunity' : 'Opportunity'} limit reached (${max}). Record the decision to exceed it with --over-limit and a reason.`, 3);
  const n = opps.opportunities.length ? Math.max(...opps.opportunities.map((o) => Number(o.id.slice(2)))) + 1 : 1;
  const id = `O-${pad(n, 2)}`;
  const paths = asList(opts.paths);
  const opp = {
    id,
    title,
    kind,
    occasion: occasion || null,
    surface: str(opts.surface) || '',
    location: str(opts.location) || '',
    state: 'open',
    stateReason: '',
    dependsOn: asList(opts.depends),
    conflictsWith: asList(opts.conflicts),
    snapshot: { git: gitInfo(run.target.code), url: run.target.url, capturedAt: now() },
    fingerprint: paths.length && run.target.code ? { paths, ...hashPaths(paths, run.target.code) } : null,
    variants: [{
      id: 'V0',
      name: 'Keep original',
      revisions: [{ rev: 1, file: null, hash: null, created: now(), basedOn: null, decision: 'undecided', decisionReason: '', preferred: false, work: 'proposed', workEvidence: '', preview: null, feedback: [] }],
    }],
  };
  opps.opportunities.push(opp);
  fs.mkdirSync(path.join(dir, 'proposals', id), { recursive: true });
  save(dir, state);
  log(dir, { kind: 'opportunity', ref: id, to: 'open', by: 'controller', reason: title, overLimit: !!opts['over-limit'] });
  console.log(`CREATED ${id}${opp.fingerprint?.missing.length ? `  (warning: missing paths ${opp.fingerprint.missing.join(', ')})` : ''}`);
  return 0;
};

function newRevision(dir, opp, variant, rev, draft, basedOn) {
  if (!draft || !fs.existsSync(draft)) die(`Proposal file not found: ${draft}`);
  const rel = path.posix.join('proposals', opp.id, variant.id, `r${rev}.md`);
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (fs.existsSync(abs)) die(`${rel} already exists; I do not overwrite recorded revisions.`);
  fs.copyFileSync(draft, abs);
  return { rev, file: rel, hash: sha256(fs.readFileSync(abs)), created: now(), basedOn, decision: 'undecided', decisionReason: '', preferred: false, work: 'proposed', workEvidence: '', preview: null, feedback: [] };
}

commands['variant-add'] = ({ pos, opts }) => {
  const dir = runPath(opts, pos[0]);
  const state = load(dir);
  const { opp } = resolve(state.opps, pos[1]);
  const name = str(opts.name);
  if (!name) die('Provide --name (a name describing the direction, never "Option A").');
  const real = opp.variants.filter((v) => v.id !== 'V0');
  if (real.length >= state.run.limits.maxVariantsPerOpportunity && !opts['over-limit'])
    die(`Variant limit per opportunity reached (${state.run.limits.maxVariantsPerOpportunity}). Use --over-limit with a recorded reason.`, 3);
  const id = `V${Math.max(0, ...opp.variants.map((v) => Number(v.id.slice(1)))) + 1}`;
  const variant = { id, name, axis: str(opts.axis) || '', revisions: [] };
  variant.revisions.push(newRevision(dir, opp, variant, 1, str(opts.file), null));
  opp.variants.push(variant);
  save(dir, state);
  log(dir, { kind: 'variant', ref: `${opp.id}/${id}/r1`, to: 'proposed', by: 'controller', reason: name });
  console.log(`CREATED ${opp.id}/${id}/r1  ${variant.revisions[0].file}`);
  return 0;
};

commands['variant-revise'] = ({ pos, opts }) => {
  const dir = runPath(opts, pos[0]);
  const state = load(dir);
  const { opp, variant } = resolve(state.opps, pos[1]);
  if (variant.id === 'V0') die('V0 is the original; it has no revisions.');
  const last = variant.revisions.at(-1);
  if (variant.revisions.length > state.run.limits.reviewRounds && !opts['over-limit'])
    die(`Review round limit reached (${state.run.limits.reviewRounds}) for ${opp.id}/${variant.id}. Use --over-limit with a recorded reason.`, 3);
  const r = newRevision(dir, opp, variant, last.rev + 1, str(opts.file), last.rev);
  variant.revisions.push(r);
  save(dir, state);
  const ref = `${opp.id}/${variant.id}/r${r.rev}`;
  log(dir, { kind: 'revision', ref, from: `r${last.rev}`, to: 'proposed', by: 'controller', reason: str(opts.reason) || '' });
  console.log(`CREATED ${ref}  ${r.file}`);
  if (['preview', 'implement'].includes(last.decision))
    console.log(`WARNING: r${last.rev} had decision "${last.decision}". r${r.rev} starts "undecided" and does NOT inherit that decision; record the user's choice for the new revision.`);
  return 0;
};

function requireQuote(opts) {
  const q = str(opts.quote);
  if (!q) die('User decisions require --quote "<exact words from the user>".');
  return q;
}

commands.decide = ({ pos, opts }) => {
  const [id, ref, decision] = pos;
  const dir = runPath(opts, id);
  const state = load(dir);
  const reason = str(opts.reason) || '';
  const quote = requireQuote(opts);
  const r = parseRef(ref);

  if (!r.variant) {
    const { opp } = resolve(state.opps, ref);
    if (decision === 'keep-original') {
      const v0 = opp.variants[0].revisions[0];
      const other = allRevisions(state.opps).find((x) => x.opp === opp && x.variant.id !== 'V0' && x.revision.decision === 'implement');
      if (other && !opts.replace) die(`${other.ref} is already chosen for implementation. Use --replace to switch to "keep original".`);
      if (other) other.revision.decision = 'undecided';
      v0.decision = 'implement'; v0.work = 'verified'; v0.workEvidence = 'Keep original: no change to the target.';
      opp.state = 'closed'; opp.stateReason = reason || 'keep original';
      save(dir, state);
      log(dir, { kind: 'decision', ref: `${opp.id}/V0/r1`, to: 'implement', by: 'user', quote, reason: reason || 'keep original' });
      console.log(`OK ${opp.id}: keep original (opportunity closed; other variants kept in history).`);
      return 0;
    }
    if (!OPP_STATES.includes(decision)) die(`Invalid opportunity decision: ${decision}. Use ${OPP_STATES.join(', ')} or keep-original.`);
    const prev = opp.state;
    opp.state = decision; opp.stateReason = reason;
    save(dir, state);
    log(dir, { kind: 'decision', ref: opp.id, from: prev, to: decision, by: 'user', quote, reason });
    console.log(`OK ${opp.id}: ${prev} → ${decision}`);
    return 0;
  }

  if (!DECISIONS.includes(decision)) die(`Invalid decision: ${decision}. Use ${DECISIONS.join(', ')}.`);
  const { opp, variant, revision } = resolve(state.opps, ref, { needRev: true });
  if (decision === 'implement') {
    if (state.run.mode === 'url' && !opts.external) die('URL-only run: there is no way to change the real target. Use --external only if an authorized editing integration exists.', 3);
    if (revision.work === 'stale') die(`${ref} is stale. Revalidate (fingerprint --revalidated) or create a new revision before authorizing implementation.`, 3);
    const other = allRevisions(state.opps).find((x) => x.opp === opp && x.revision !== revision && x.revision.decision === 'implement');
    if (other && !opts.replace) die(`${other.ref} is already chosen for implementation in this opportunity. Use --replace to switch (the previous one goes back to "undecided").`, 3);
    if (other) { other.revision.decision = 'undecided'; log(dir, { kind: 'decision', ref: other.ref, from: 'implement', to: 'undecided', by: 'user', quote, reason: `replaced by ${ref}` }); }
    if (variant.revisions.at(-1) !== revision) console.log(`WARNING: ${ref} is not the latest revision (r${variant.revisions.at(-1).rev}). Recorded exactly as requested.`);
    if (opp.state !== 'open') { opp.state = 'open'; opp.stateReason = ''; }
  }
  const prev = revision.decision;
  revision.decision = decision;
  revision.decisionReason = reason;
  save(dir, state);
  log(dir, { kind: 'decision', ref, from: prev, to: decision, by: 'user', quote, reason });
  console.log(`OK ${ref}: ${prev} → ${decision}`);
  return 0;
};

const WORK_RULES = {
  'mock-building': ({ revision }) => ['preview', 'implement'].includes(revision.decision) || 'requires decision "preview" (or "implement") on this exact revision',
  'mock-ready': ({ revision }) => !!revision.preview || 'record the preview with preview-set',
  'review-requested': ({ revision }) => ['mock-ready', 'implemented'].includes(revision.work) || 'requires mock-ready or implemented',
  implementing: ({ revision }) => revision.decision === 'implement' || 'requires decision "implement" on this exact revision',
  implemented: ({ revision }) => revision.work === 'implementing' || 'requires implementing',
  verified: ({ revision }) => ['implemented', 'review-requested'].includes(revision.work) && revision.decision === 'implement' || 'requires implemented with decision "implement"',
  blocked: () => true,
  stale: () => true,
  proposed: ({ revision }) => ['blocked', 'stale'].includes(revision.work) || 'only returns to proposed from blocked or stale',
};

function setWork(dir, state, ref, work, evidence, by = 'controller') {
  if (!WORK.includes(work)) die(`Invalid work state: ${work}. Use ${WORK.join(', ')}.`);
  const target = resolve(state.opps, ref, { needRev: true });
  const ok = WORK_RULES[work](target);
  if (ok !== true) die(`Transition refused for ${ref} → ${work}: ${ok}.`, 3);
  if (['verified', 'blocked'].includes(work) && !evidence) die(`"${work}" requires --evidence.`);
  const prev = target.revision.work;
  target.revision.work = work;
  if (evidence) target.revision.workEvidence = evidence;
  log(dir, { kind: 'work', ref, from: prev, to: work, by, evidence });
  return prev;
}

commands.work = ({ pos, opts }) => {
  const [id, ref, work] = pos;
  const dir = runPath(opts, id);
  const state = load(dir);
  const prev = setWork(dir, state, ref, work, str(opts.evidence));
  save(dir, state);
  console.log(`OK ${ref}: ${prev} → ${work}`);
  return 0;
};

commands['preview-set'] = ({ pos, opts }) => {
  const [id, ref] = pos;
  const dir = runPath(opts, id);
  const state = load(dir);
  const t = resolve(state.opps, ref, { needRev: true });
  // V0 is the original baseline: it enters the lab without selection, as a comparison reference.
  if (t.variant.id !== 'V0' && !['preview', 'implement'].includes(t.revision.decision)) die(`${ref} was not selected for preview by the user.`, 3);
  const loc = str(opts.path);
  const fidelity = str(opts.fidelity);
  if (!loc || !fidelity) die('Provide --path (directory relative to the run, or URL) and --fidelity "<what is functional and what is simulated>".');
  let hash = null;
  if (!/^https?:\/\//.test(loc)) {
    const abs = path.resolve(dir, loc);
    if (!fs.existsSync(abs)) die(`Preview not found: ${abs}`);
    hash = hashPaths([path.relative(dir, abs)], dir).hash;
  }
  t.revision.preview = { path: loc, entry: str(opts.entry) || 'index.html', fidelity, hash, registered: now() };
  setWork(dir, state, ref, 'mock-ready', str(opts.evidence));
  save(dir, state);
  console.log(`OK ${ref}: preview recorded (${loc})`);
  return 0;
};

commands['composition-set'] = ({ pos, opts }) => {
  const [id, cid] = pos;
  const dir = runPath(opts, id);
  const state = load(dir);
  if (!/^C-\d+$/.test(cid || '')) die('Provide the composition ID (e.g. C-01).');
  const refs = asList(opts.refs);
  if (refs.length < 2) die('A composition combines at least two revisions: --refs O-01/V2/r1 O-02/V1/r1.');
  for (const ref of refs) {
    const t = resolve(state.opps, ref, { needRev: true });
    if (!['preview', 'implement'].includes(t.revision.decision)) die(`${ref} is not selected by the user; it cannot enter a composition.`, 3);
  }
  const loc = str(opts.path);
  if (!loc || !fs.existsSync(path.resolve(dir, loc))) die('Provide an existing --path (e.g. previews/_composition/C-01).');
  const comp = { id: cid, refs, path: loc, entry: 'index.html', fidelity: str(opts.fidelity) || '', conflicts: str(opts.conflicts) || '', registered: now() };
  state.run.compositions = (state.run.compositions || []).filter((c) => c.id !== cid).concat(comp);
  save(dir, state);
  log(dir, { kind: 'composition', ref: cid, to: refs.join(' + '), by: 'controller', reason: comp.conflicts });
  console.log(`OK ${cid}: ${refs.join(' + ')}`);
  return 0;
};

commands.fingerprint = ({ pos, opts }) => {
  const [id, ref] = pos;
  const dir = runPath(opts, id);
  const state = load(dir);
  if (opts['url-snapshot']) {
    const file = str(opts['url-snapshot']);
    state.run.target.urlSnapshotHash = sha256(fs.readFileSync(file));
    save(dir, state);
    log(dir, { kind: 'fingerprint', ref: 'url', to: state.run.target.urlSnapshotHash, by: 'controller' });
    console.log(`OK URL snapshot recorded ${state.run.target.urlSnapshotHash.slice(0, 19)}…`);
    return 0;
  }
  const { opp } = resolve(state.opps, ref);
  if (!state.run.target.code) die('File fingerprint requires source code (--code at init).');
  const paths = asList(opts.paths).length ? asList(opts.paths) : opp.fingerprint?.paths || [];
  if (!paths.length) die('Provide --paths.');
  opp.fingerprint = { paths, ...hashPaths(paths, state.run.target.code) };
  opp.snapshot = { git: gitInfo(state.run.target.code), url: state.run.target.url, capturedAt: now() };
  let restored = 0;
  if (opts.revalidated) {
    for (const v of opp.variants) for (const r of v.revisions)
      if (r.work === 'stale') { r.work = r.staleFrom || 'proposed'; delete r.staleFrom; restored++; log(dir, { kind: 'work', ref: `${opp.id}/${v.id}/r${r.rev}`, from: 'stale', to: r.work, by: 'controller', evidence: str(opts.evidence) || 'revalidated after a change in the target' }); }
  }
  save(dir, state);
  log(dir, { kind: 'fingerprint', ref: opp.id, to: opp.fingerprint.hash, by: 'controller' });
  console.log(`OK ${opp.id}: fingerprint ${opp.fingerprint.hash.slice(0, 19)}…${restored ? `; ${restored} revision(s) revalidated` : ''}`);
  return 0;
};

commands['check-stale'] = ({ pos, opts }) => {
  const dir = runPath(opts, pos[0]);
  const state = load(dir);
  const { run, opps } = state;
  const report = [];
  const git = gitInfo(run.target.code);
  if (run.target.git?.head && git?.head && git.head !== run.target.git.head)
    report.push(`GIT: HEAD changed ${run.target.git.head.slice(0, 7)} → ${git.head.slice(0, 7)} since init.`);
  if (opts['url-snapshot']) {
    const h = sha256(fs.readFileSync(str(opts['url-snapshot'])));
    if (run.target.urlSnapshotHash && h !== run.target.urlSnapshotHash)
      report.push('URL: the published HTML changed since the recorded snapshot. Compare the surfaces of open opportunities and manually mark the affected ones (work <ref> stale).');
  }
  let marked = 0;
  for (const opp of opps.opportunities) {
    if (!opp.fingerprint || !run.target.code || ['closed', 'dismissed'].includes(opp.state)) continue;
    const cur = hashPaths(opp.fingerprint.paths, run.target.code);
    if (cur.hash === opp.fingerprint.hash) continue;
    const affected = [];
    for (const v of opp.variants) for (const r of v.revisions) {
      if (v.id === 'V0' || !STALEABLE.includes(r.work)) continue;
      r.staleFrom = r.work; r.work = 'stale'; marked++;
      const ref = `${opp.id}/${v.id}/r${r.rev}`;
      affected.push(ref);
      log(dir, { kind: 'work', ref, from: r.staleFrom, to: 'stale', by: 'controller', evidence: `surface files changed (${opp.fingerprint.paths.join(', ')})` });
    }
    report.push(`${opp.id}: files changed (${opp.fingerprint.paths.join(', ')})${cur.missing.length ? `; missing: ${cur.missing.join(', ')}` : ''}. Stale: ${affected.join(', ') || 'none (items in implementation/implemented are not marked; check them manually)'}`);
  }
  if (marked) save(dir, state);
  console.log(report.length ? report.join('\n') : 'NO_CHANGES in the recorded surfaces.');
  return report.length ? 4 : 0;
};

// ---------- media (idempotency of paid generation) ----------

function mediaLedger(dir) {
  const f = path.join(dir, 'assets', 'media.jsonl');
  const entries = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const byKey = new Map();
  for (const e of entries) byKey.set(e.key, { ...(byKey.get(e.key) || {}), ...e });
  return { f, byKey };
}

commands.media = ({ pos, opts }) => {
  const [id, action] = pos;
  const dir = runPath(opts, id);
  const state = load(dir);
  const { f, byKey } = mediaLedger(dir);
  const append = (e) => fs.appendFileSync(f, JSON.stringify({ ts: now(), ...e }) + '\n');
  if (action === 'claim') {
    const spec = str(opts.spec);
    if (!spec) die('Provide --spec "<provider|model|prompt|parameters>" — it defines the idempotency key.');
    const key = sha256(spec).slice(7, 23);
    const cur = byKey.get(key);
    if (cur?.status === 'done') { console.log(`EXISTS ${key} ${cur.path}`); return 0; }
    if (cur?.status === 'claimed') { console.log(`IN_PROGRESS ${key} — previous attempt did not complete. Check the provider history before generating again; then use "media done" or "media fail".`); return 3; }
    const auth = state.run.authorizations.media;
    const est = Number(str(opts.estimate) || 0);
    if (!auth.authorized) { console.log('REFUSED paid media not authorized in this run (set authorizations.media.authorized true --quote ...).'); return 3; }
    if (auth.spent + est > auth.limit) { console.log(`REFUSED budget: spent ${auth.spent} + estimate ${est} > limit ${auth.limit} ${auth.unit}.`); return 3; }
    append({ key, status: 'claimed', spec, ref: str(opts.ref), estimate: est });
    console.log(`CLAIMED ${key}`);
    return 0;
  }
  if (action === 'done' || action === 'fail') {
    const key = str(opts.key);
    const cur = byKey.get(key);
    if (!cur) die(`Key ${key} was not claimed.`);
    if (action === 'done') {
      const p = str(opts.path);
      if (!p) die('Provide --path of the saved asset (relative to the run).');
      if (!fs.existsSync(path.resolve(dir, p))) die(`Asset not found: ${p}`);
      const cost = Number(str(opts.cost) || cur.estimate || 0);
      state.run.authorizations.media.spent += cost;
      save(dir, state);
      append({ key, status: 'done', path: p, cost, provenance: str(opts.provenance) });
    } else append({ key, status: 'failed', reason: str(opts.reason) || '' });
    console.log(`OK ${key} ${action}`);
    return 0;
  }
  if (action === 'list') {
    for (const [k, e] of byKey) console.log(`${k}  ${e.status}  ${e.ref || ''}  ${e.path || ''}  ${e.spec}`);
    return 0;
  }
  die('Use media claim|done|fail|list.');
};

// ---------- implementation tasks ----------

function tasksFile(dir) { return path.join(dir, 'tasks', 'tasks.json'); }

commands.task = ({ pos, opts }) => {
  const [id, action, tid] = pos;
  const dir = runPath(opts, id);
  const state = load(dir);
  const tf = tasksFile(dir);
  const db = readJSON(tf);
  const find = () => db.tasks.find((t) => t.id === tid) || die(`Task ${tid} does not exist.`);
  if (action === 'add') {
    const ref = str(opts.ref);
    const t = resolve(state.opps, ref, { needRev: true });
    if (t.revision.decision !== 'implement') die(`${ref} is not chosen for implementation.`, 3);
    const files = asList(opts.files);
    if (!files.length) die('Provide --files (files the task may modify).');
    const batch = db.tasks.filter((x) => ['pending', 'in_progress'].includes(x.status));
    if (batch.length >= state.run.limits.maxChangesPerBatch && !opts['over-limit'])
      die(`Change limit per batch (${state.run.limits.maxChangesPerBatch}) reached. Finish the batch or use --over-limit.`, 3);
    const n = db.tasks.length + 1;
    const task = { id: `T-${pad(n, 3)}`, ref, title: str(opts.title) || ref, files, status: 'pending', agent: null, evidence: '', created: now() };
    db.tasks.push(task);
    writeJSON(tf, db);
    log(dir, { kind: 'task', ref: task.id, to: 'pending', by: 'controller', reason: `${ref}: ${files.join(', ')}` });
    console.log(`CREATED ${task.id} for ${ref}`);
    return 0;
  }
  if (action === 'start') {
    const task = find();
    if (task.status !== 'pending' && task.status !== 'blocked') die(`${tid} is ${task.status}.`);
    const clash = db.tasks.filter((x) => x !== task && x.status === 'in_progress' && x.files.some((f) => task.files.includes(f)));
    if (clash.length) die(`File conflict with ${clash.map((c) => c.id).join(', ')} in progress. Sequence the tasks.`, 3);
    const t = resolve(state.opps, task.ref, { needRev: true });
    if (t.revision.decision !== 'implement') die(`${task.ref} is no longer chosen for implementation.`, 3);
    if (t.revision.work !== 'implementing') setWork(dir, state, task.ref, 'implementing', '');
    task.status = 'in_progress'; task.agent = str(opts.agent) || null; task.started = now();
    writeJSON(tf, db); save(dir, state);
    log(dir, { kind: 'task', ref: task.id, to: 'in_progress', by: 'controller', reason: task.agent || '' });
    console.log(`OK ${tid} in progress`);
    return 0;
  }
  if (action === 'done' || action === 'block') {
    const task = find();
    const ev = str(opts.evidence);
    if (!ev) die('Provide --evidence.');
    task.status = action === 'done' ? 'done' : 'blocked'; task.evidence = ev; task.finished = now();
    writeJSON(tf, db);
    log(dir, { kind: 'task', ref: task.id, to: task.status, by: 'controller', evidence: ev });
    const open = db.tasks.filter((x) => x.ref === task.ref && x.status !== 'done');
    if (action === 'done' && !open.length) { setWork(dir, state, task.ref, 'implemented', ev); save(dir, state); console.log(`${task.ref} → implemented (all tasks done)`); }
    if (action === 'block') { setWork(dir, state, task.ref, 'blocked', ev); save(dir, state); }
    console.log(`OK ${tid} ${task.status}`);
    return 0;
  }
  if (action === 'list') {
    for (const t of db.tasks) console.log(`${t.id}  ${t.status.padEnd(11)}  ${t.ref}  ${t.files.join(', ')}${t.agent ? `  agent=${t.agent}` : ''}`);
    return 0;
  }
  die('Use task add|start|done|block|list.');
};

// ---------- lab events ----------

function validateEvent(ev, opps) {
  if (!ev || typeof ev !== 'object') return 'event is not an object';
  if (!EVENT_TYPES.includes(ev.type)) return `invalid type "${ev.type}"`;
  try { resolve(opps, ev.ref, { needRev: true }); } catch (e) { return e.message; }
  if (['comment', 'adjust'].includes(ev.type) && !String(ev.text || '').trim()) return 'empty comment';
  return null;
}

commands['events-ingest'] = ({ pos, opts }) => {
  const dir = runPath(opts, pos[0]);
  const state = load(dir);
  const inbox = path.join(dir, 'events', 'inbox');
  const done = path.join(dir, 'events', 'processed');
  const files = fs.readdirSync(inbox).filter((f) => f.endsWith('.json')).sort();
  if (!files.length) { console.log('NO_EVENTS'); return 0; }
  // State is saved first; log lines and inbox moves happen only after a successful save,
  // so a failed write (e.g. a full disk) leaves the events in the inbox to be ingested again.
  const logs = [];
  const moves = [];
  const report = [];
  let applied = 0;
  for (const f of files) {
    const abs = path.join(inbox, f);
    let ev;
    try { ev = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch { ev = null; }
    const err = validateEvent(ev, state.opps);
    if (err) {
      moves.push([abs, path.join(done, `rejected-${f}`)]);
      logs.push({ kind: 'event-rejected', ref: ev?.ref, by: 'lab', reason: err, source: f });
      report.push(`REJECTED ${f}: ${err}`);
      continue;
    }
    const t = resolve(state.opps, ev.ref, { needRev: true });
    const entry = { type: ev.type, text: ev.text || '', viewport: ev.viewport || null, ts: ev.ts || now(), source: f };
    t.revision.feedback.push(entry);
    if (ev.type === 'prefer') t.revision.preferred = true;
    if (ev.type === 'reject' || ev.type === 'defer') {
      const to = ev.type === 'reject' ? 'rejected' : 'deferred';
      if (t.revision.decision === 'implement')
        report.push(`WARNING ${ev.ref}: chosen for implementation; the lab does not revoke that. Confirm with the user (decide ... --quote).`);
      else {
        logs.push({ kind: 'decision', ref: ev.ref, from: t.revision.decision, to, by: 'user', quote: ev.text || `(${ev.type} in the lab)`, source: `lab:${f}` });
        t.revision.decision = to;
      }
    }
    logs.push({ kind: 'feedback', ref: ev.ref, to: ev.type, by: 'user', quote: ev.text || '', source: `lab:${f}` });
    moves.push([abs, path.join(done, f)]);
    applied++;
    report.push(`APPLIED ${f}: ${ev.ref} ${ev.type}${ev.text ? ` — "${ev.text}"` : ''}`);
  }
  save(dir, state);
  for (const entry of logs) log(dir, entry);
  for (const [from, to] of moves) fs.renameSync(from, to);
  for (const line of report) console.log(line);
  console.log(`${applied} event(s) incorporated. "adjust" requests a new variant revision; "prefer" does not authorize implementation.`);
  return 0;
};

// ---------- reading, validation and next action ----------

const DECISION_LABEL = { undecided: 'undecided', preview: 'selected for preview', rejected: 'rejected', deferred: 'deferred', implement: 'chosen for implementation' };

commands.show = ({ pos, opts }) => {
  const dir = runPath(opts, pos[0]);
  const { run, opps } = load(dir);
  if (opts.json) { console.log(JSON.stringify({ run, opportunities: opps.opportunities }, null, 2)); return 0; }
  console.log(`${run.id} — ${run.title}\nmode=${run.mode}  phase=${run.phase}  updated=${run.updated}`);
  console.log(`target: ${run.target.url || '—'} | ${run.target.code || '—'}${run.target.git ? ` @ ${run.target.git.head.slice(0, 7)} (${run.target.git.branch}${run.target.git.dirty ? ', dirty' : ''})` : ''}`);
  console.log(`next action: ${run.nextAction}`);
  console.log(`media: ${run.authorizations.media.authorized ? `authorized ${run.authorizations.media.spent}/${run.authorizations.media.limit} ${run.authorizations.media.unit}` : 'not authorized'}  publishing: ${run.authorizations.publish ? 'authorized' : 'not authorized'}`);
  for (const opp of opps.opportunities) {
    console.log(`\n${opp.id} [${opp.state}]${opp.kind === 'seasonal' ? ` [seasonal: ${opp.occasion}]` : ''} ${opp.title} —${opp.surface} ${opp.location}${opp.dependsOn.length ? `  depends on ${opp.dependsOn.join(', ')}` : ''}${opp.conflictsWith.length ? `  conflicts with ${opp.conflictsWith.join(', ')}` : ''}`);
    for (const v of opp.variants) for (const r of v.revisions) {
      if (v.id === 'V0' && r.decision === 'undecided') continue;
      console.log(`  ${v.id}/r${r.rev}  ${v.name.padEnd(28).slice(0, 28)}  decision=${DECISION_LABEL[r.decision]}${r.preferred ? ' ★preferred' : ''}  work=${r.work}${r.preview ? `  preview=${r.preview.path}` : ''}${r.feedback.length ? `  feedback=${r.feedback.length}` : ''}`);
    }
  }
  const inbox = fs.readdirSync(path.join(dir, 'events', 'inbox')).filter((f) => f.endsWith('.json')).length;
  if (inbox) console.log(`\n${inbox} lab event(s) waiting for events-ingest.`);
  return 0;
};

commands.validate = ({ pos, opts }) => {
  const dir = runPath(opts, pos[0]);
  const { opps } = load(dir);
  const problems = [];
  for (const { revision, ref } of allRevisions(opps)) {
    if (revision.file) {
      const abs = path.join(dir, revision.file);
      if (!fs.existsSync(abs)) problems.push(`MISSING proposal ${ref}: ${revision.file}`);
      else if (sha256(fs.readFileSync(abs)) !== revision.hash) problems.push(`CHANGED proposal ${ref}: the file changed without a new revision (use variant-revise).`);
    }
    if (revision.preview && !/^https?:/.test(revision.preview.path)) {
      const abs = path.resolve(dir, revision.preview.path);
      if (!fs.existsSync(abs)) problems.push(`MISSING preview ${ref}: ${revision.preview.path}`);
      else if (revision.preview.hash && hashPaths([path.relative(dir, abs)], dir).hash !== revision.preview.hash)
        problems.push(`CHANGED preview ${ref}: the mock code changed since it was recorded (record it again or create a new revision).`);
    }
  }
  const { byKey } = mediaLedger(dir);
  for (const [k, e] of byKey) {
    if (e.status === 'done' && !fs.existsSync(path.resolve(dir, e.path))) problems.push(`MISSING media asset ${k}: ${e.path}`);
    if (e.status === 'claimed') problems.push(`PENDING media generation ${k} without completion: reconcile with the provider before repeating.`);
  }
  const db = readJSON(tasksFile(dir));
  for (const t of db.tasks) if (t.status === 'in_progress') problems.push(`IN_PROGRESS task ${t.id} (${t.ref}): check the diff/result before re-dispatching.`);
  console.log(problems.length ? problems.join('\n') : 'OK state is consistent.');
  return problems.length ? 4 : 0;
};

commands.next = ({ pos, opts }) => {
  const dir = runPath(opts, pos[0]);
  const { run, opps } = load(dir);
  const out = [];
  const inbox = fs.readdirSync(path.join(dir, 'events', 'inbox')).filter((f) => f.endsWith('.json')).length;
  if (inbox) out.push(`Ingest ${inbox} lab event(s): events-ingest ${run.id}`);
  const db = readJSON(tasksFile(dir));
  for (const t of db.tasks.filter((x) => x.status === 'in_progress')) out.push(`Reconcile in-progress task ${t.id} (${t.ref}) before any new dispatch.`);
  const revs = allRevisions(opps).filter(({ opp, variant }) => variant.id !== 'V0' && !['closed', 'dismissed', 'deferred'].includes(opp.state));
  for (const x of revs) {
    const { revision: r, ref } = x;
    const latest = x.variant.revisions.at(-1) === r;
    const adjusts = r.feedback.filter((f) => f.type === 'adjust');
    if (latest && adjusts.length && r.decision !== 'rejected') out.push(`${ref}: ${adjusts.length} adjustment request(s) — generate r${r.rev + 1} (latest: "${adjusts.at(-1).text}").`);
    if (r.work === 'stale') out.push(`${ref}: stale — revalidate against the current target or create a new revision.`);
    else if (r.decision === 'preview' && ['proposed', 'mock-building'].includes(r.work)) out.push(`${ref}: build mock (lab).`);
    else if (r.work === 'mock-ready' && !r.reviewed) out.push(`${ref}: mock ready — independent critic review and presentation in the lab.`);
    else if (r.decision === 'implement' && ['proposed', 'mock-ready', 'review-requested', 'mock-building'].includes(r.work)) out.push(`${ref}: implement in the target (create tasks).`);
    else if (r.work === 'implemented') out.push(`${ref}: verify integration (diff + rendered experience).`);
  }
  if (!opps.opportunities.length) out.push(`Phase ${run.phase}: ${run.nextAction}`);
  const waiting = revs.filter(({ revision: r }) => r.decision === 'undecided' && r.work === 'proposed').map((x) => x.ref);
  if (waiting.length) out.push(`Waiting for the user's choice: ${waiting.join(', ')}`);
  console.log(out.length ? out.map((l, i) => `${i + 1}. ${l}`).join('\n') : 'Nothing pending. Offer a new round, another opportunity, or closing.');
  return 0;
};

commands.reviewed = ({ pos, opts }) => {
  const [id, ref] = pos;
  const dir = runPath(opts, id);
  const state = load(dir);
  const t = resolve(state.opps, ref, { needRev: true });
  const file = str(opts.file);
  if (!file || !fs.existsSync(path.resolve(dir, file))) die('Provide --file with the review saved in reviews/.');
  t.revision.reviewed = { file, by: str(opts.by) || 'critic', independent: !opts['self'], ts: now() };
  save(dir, state);
  log(dir, { kind: 'review', ref, to: file, by: 'controller', reason: opts['self'] ? 'sequential pass without an independent agent' : 'independent critic' });
  console.log(`OK ${ref}: review recorded (${t.revision.reviewed.independent ? 'independent' : 'same session — not an independent review'})`);
  return 0;
};

// Decisions the controller takes on the user's behalf (technical conflicts, parked
// findings, deferred minors). All of them are listed to the user at the end of E8.
commands.ruling = ({ pos, opts }) => {
  const [id, ...words] = pos;
  const dir = runPath(opts, id);
  const text = words.join(' ').trim();
  if (!text) die('Write the ruling: jiu ruling <R> "<what was decided and why>" [--ref O-01/V2/r1|T-001] [--cost "<what it costs if wrong>"].');
  const ref = str(opts.ref);
  if (ref && !/^T-\d+$/.test(ref)) resolve(load(dir).opps, ref);
  log(dir, { kind: 'ruling', ref: ref || null, by: 'controller', reason: text, cost: str(opts.cost) || '' });
  console.log(`OK ruling recorded${ref ? ` for ${ref}` : ''}`);
  return 0;
};

commands.rulings = ({ pos, opts }) => {
  const dir = runPath(opts, pos[0]);
  const lines = fs.readFileSync(path.join(dir, 'decisions.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.kind === 'ruling');
  if (!lines.length) { console.log('NO_RULINGS'); return 0; }
  lines.forEach((e, i) => console.log(`${i + 1}. ${e.ts.slice(0, 16)}${e.ref ? ` [${e.ref}]` : ''} ${e.reason}${e.cost ? ` — if wrong: ${e.cost}` : ''}`));
  return 0;
};

// ---------- lab server ----------

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.riv': 'application/octet-stream', '.glb': 'model/gltf-binary', '.md': 'text/markdown; charset=utf-8' };

commands.serve = ({ pos, opts }) => {
  const id = pos[0];
  const dir = runPath(opts, id);
  const port = Number(str(opts.port) || 4977);
  const harness = path.join(SKILL_DIR, 'assets', 'lab-harness.html');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const send = (code, body, type = 'text/plain; charset=utf-8') => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); };
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return send(200, fs.readFileSync(harness), MIME['.html']);
    if (req.method === 'GET' && url.pathname === '/api/state') {
      const { run, opps } = load(dir);
      return send(200, JSON.stringify({ run, opportunities: opps.opportunities }), MIME['.json']);
    }
    if (req.method === 'POST' && url.pathname === '/api/events') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 65536) req.destroy(); });
      req.on('end', () => {
        let ev;
        try { ev = JSON.parse(body); } catch { return send(400, 'Invalid JSON'); }
        const err = validateEvent(ev, load(dir).opps);
        if (err) return send(422, err);
        const name = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}.json`;
        fs.writeFileSync(path.join(dir, 'events', 'inbox', name), JSON.stringify({ ...ev, ts: now() }, null, 2));
        send(201, JSON.stringify({ ok: true, file: name }), MIME['.json']);
      });
      return;
    }
    if (req.method === 'GET' && url.pathname.startsWith('/run/')) {
      let rel = decodeURIComponent(url.pathname.slice(5));
      let abs = path.resolve(dir, rel);
      if (!abs.startsWith(dir + path.sep) && abs !== dir) return send(403, 'outside the run');
      if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) abs = path.join(abs, 'index.html');
      if (!fs.existsSync(abs)) return send(404, 'not found');
      return send(200, fs.readFileSync(abs), MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream');
    }
    send(404, 'not found');
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`LAB http://127.0.0.1:${port}/  (run ${id}; events in events/inbox; Ctrl+C stops without deleting anything)`);
  });
  return new Promise(() => {});
};

commands.help = () => {
  console.log(`jiu — juice-it-up workflow state
Global: --state <dir> (default: ./.juice-it-up or $JIU_STATE)

  init --url <u> --code <dir> [--title t] [--new]     create a run (or point to the existing one)
  list [--url u] [--code dir] [--all]                  list runs
  show <R> [--json] | next <R> | validate <R>          read, next action, consistency
  set <R> <key> <value> [--quote "..."]                phase, nextAction, limits.*, capabilities.*, authorizations
  opp-add <R> --title t --surface s --location l [--paths p...] [--depends O-..] [--conflicts O-..]
  variant-add <R> <O-01> --name n --axis a --file draft.md
  variant-revise <R> <O-01/V2> --file draft.md --reason r
  decide <R> <O-01/V2/r1> <undecided|preview|rejected|deferred|implement> --quote "..." [--reason r] [--replace]
  decide <R> <O-01> <open|deferred|dismissed|keep-original> --quote "..."
  work <R> <O-01/V2/r1> <state> [--evidence e]
  preview-set <R> <O-01/V2/r1> --path previews/O-01/V2/r1 --fidelity "..."
  composition-set <R> <C-01> --refs O-01/V2/r1 O-02/V1/r1 --path previews/_composition/C-01 [--conflicts "..."]
  reviewed <R> <O-01/V2/r1> --file reviews/x.md [--self]
  ruling <R> "<decision and why>" [--ref O-01/V2/r1|T-001] [--cost "..."] | rulings <R>
  fingerprint <R> <O-01> --paths p... [--revalidated] | fingerprint <R> --url-snapshot file
  check-stale <R> [--url-snapshot file]
  media <R> claim --spec "..." --estimate n --ref O-01/V2/r1 | done --key k --path p --cost n | fail --key k | list
  task <R> add --ref O-01/V2/r3 --files f... | start T-001 [--agent id] | done T-001 --evidence e | block T-001 --evidence e | list
  events-ingest <R>
  serve <R> [--port 4977]

Exit codes: 0=ok, 1=error, 2=existing run, 3=refused by rule/authorization, 4=problems found.`);
  return 0;
};

// ---------- main ----------

const [cmd, ...rest] = process.argv.slice(2);
const fn = commands[cmd || 'help'];
if (!fn) { console.error(`Unknown command: ${cmd}. Use "help".`); process.exit(1); }
try {
  const r = await fn(parseArgs(rest));
  process.exitCode = r ?? 0;
} catch (e) {
  if (e instanceof CliError) { console.error(`ERROR: ${e.message}`); process.exitCode = e.code; }
  else throw e;
}
