// juice-it-up state tests: node --test scripts/jiu.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), 'jiu.mjs');

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jiu-'));
  const code = path.join(root, 'site');
  fs.mkdirSync(path.join(code, 'src'), { recursive: true });
  fs.writeFileSync(path.join(code, 'src', 'Hero.tsx'), 'export const Hero = () => null;\n');
  fs.writeFileSync(path.join(code, 'src', 'Cta.tsx'), 'export const Cta = () => null;\n');
  const draft = path.join(root, 'draft.md');
  fs.writeFileSync(draft, '# proposal\n');
  const state = path.join(root, 'state');
  const jiu = (...args) => {
    const r = spawnSync(process.execPath, [CLI, ...args, '--state', state], { encoding: 'utf8' });
    return { code: r.status, out: r.stdout + r.stderr };
  };
  return { root, code, draft, state, jiu };
}

function seeded() {
  const s = sandbox();
  assert.equal(s.jiu('init', '--url', 'https://exemplo.com/', '--code', s.code).code, 0);
  assert.equal(s.jiu('opp-add', 'R-001', '--title', 'Hero', '--surface', 'home', '--paths', 'src/Hero.tsx').code, 0);
  assert.equal(s.jiu('opp-add', 'R-001', '--title', 'CTA', '--surface', 'home', '--paths', 'src/Cta.tsx').code, 0);
  assert.equal(s.jiu('variant-add', 'R-001', 'O-01', '--name', 'Editorial', '--file', s.draft).code, 0);
  assert.equal(s.jiu('variant-add', 'R-001', 'O-01', '--name', 'Quiet', '--file', s.draft).code, 0);
  assert.equal(s.jiu('variant-add', 'R-001', 'O-02', '--name', 'Tactile', '--file', s.draft).code, 0);
  return s;
}

const opps = (s) => JSON.parse(fs.readFileSync(path.join(s.state, 'runs', 'R-001', 'opportunities.json'), 'utf8')).opportunities;
const rev = (s, o, v, r) => opps(s).find((x) => x.id === o).variants.find((x) => x.id === v).revisions.find((x) => x.rev === r);

test('reinitializing the same target points to the existing run (resume)', () => {
  const s = sandbox();
  s.jiu('init', '--url', 'https://exemplo.com', '--code', s.code);
  const again = s.jiu('init', '--url', 'https://exemplo.com/', '--code', s.code);
  assert.equal(again.code, 2);
  assert.match(again.out, /EXISTING_RUN R-001/);
  assert.equal(s.jiu('init', '--url', 'https://exemplo.com', '--code', s.code, '--new').code, 0);
});

test('URL-only run does not accept implementation authorization', () => {
  const s = sandbox();
  s.jiu('init', '--url', 'https://exemplo.com');
  s.jiu('opp-add', 'R-001', '--title', 'Hero');
  s.jiu('variant-add', 'R-001', 'O-01', '--name', 'Editorial', '--file', s.draft);
  const r = s.jiu('decide', 'R-001', 'O-01/V1/r1', 'implement', '--quote', 'implement it');
  assert.equal(r.code, 3);
});

test('decisions require an exact revision and a user quote', () => {
  const s = seeded();
  assert.equal(s.jiu('decide', 'R-001', 'O-01/V1', 'preview', '--quote', 'I want to see it').code, 1);
  assert.equal(s.jiu('decide', 'R-001', 'O-01/V1/r1', 'preview').code, 1);
  assert.equal(s.jiu('decide', 'R-001', 'O-01/V1/r1', 'preview', '--quote', 'I want to see it').code, 0);
});

test('approving a mock does not authorize implementation', () => {
  const s = seeded();
  s.jiu('decide', 'R-001', 'O-01/V1/r1', 'preview', '--quote', 'create the mock');
  fs.mkdirSync(path.join(s.state, 'runs', 'R-001', 'previews', 'O-01', 'V1', 'r1'), { recursive: true });
  fs.writeFileSync(path.join(s.state, 'runs', 'R-001', 'previews', 'O-01', 'V1', 'r1', 'index.html'), '<p>mock</p>');
  assert.equal(s.jiu('preview-set', 'R-001', 'O-01/V1/r1', '--path', 'previews/O-01/V1/r1', '--fidelity', 'functional').code, 0);
  assert.equal(s.jiu('work', 'R-001', 'O-01/V1/r1', 'implementing').code, 3);
  assert.equal(s.jiu('task', 'R-001', 'add', '--ref', 'O-01/V1/r1', '--files', 'src/Hero.tsx').code, 3);
});

test('preview requires prior user selection', () => {
  const s = seeded();
  assert.equal(s.jiu('work', 'R-001', 'O-01/V1/r1', 'mock-building').code, 3);
});

test('partial implementation keeps the other opportunities intact', () => {
  const s = seeded();
  s.jiu('decide', 'R-001', 'O-01/V2/r1', 'implement', '--quote', 'implement O-01/V2');
  assert.equal(s.jiu('task', 'R-001', 'add', '--ref', 'O-01/V2/r1', '--files', 'src/Hero.tsx').code, 0);
  assert.equal(s.jiu('task', 'R-001', 'start', 'T-001').code, 0);
  assert.equal(s.jiu('task', 'R-001', 'done', 'T-001', '--evidence', 'diff ok').code, 0);
  assert.equal(rev(s, 'O-01', 'V2', 1).work, 'implemented');
  assert.equal(rev(s, 'O-01', 'V1', 1).decision, 'undecided');
  assert.equal(rev(s, 'O-02', 'V1', 1).work, 'proposed');
  assert.equal(s.jiu('work', 'R-001', 'O-01/V2/r1', 'verified').code, 1);
  assert.equal(s.jiu('work', 'R-001', 'O-01/V2/r1', 'verified', '--evidence', 'screens ok').code, 0);
});

test('only one revision chosen for implementation per opportunity', () => {
  const s = seeded();
  s.jiu('decide', 'R-001', 'O-01/V1/r1', 'implement', '--quote', 'V1');
  assert.equal(s.jiu('decide', 'R-001', 'O-01/V2/r1', 'implement', '--quote', 'V2').code, 3);
  assert.equal(s.jiu('decide', 'R-001', 'O-01/V2/r1', 'implement', '--quote', 'switch to V2', '--replace').code, 0);
  assert.equal(rev(s, 'O-01', 'V1', 1).decision, 'undecided');
});

test('a new revision does not inherit the previous approval', () => {
  const s = seeded();
  s.jiu('decide', 'R-001', 'O-01/V1/r1', 'preview', '--quote', 'mock');
  const r = s.jiu('variant-revise', 'R-001', 'O-01/V1', '--file', s.draft, '--reason', 'less motion');
  assert.match(r.out, /does NOT inherit/);
  assert.equal(rev(s, 'O-01', 'V1', 2).decision, 'undecided');
  assert.equal(rev(s, 'O-01', 'V1', 1).decision, 'preview');
});

test('code change after the mock marks only the affected opportunity', () => {
  const s = seeded();
  s.jiu('decide', 'R-001', 'O-01/V1/r1', 'preview', '--quote', 'mock');
  fs.appendFileSync(path.join(s.code, 'src', 'Hero.tsx'), '// changed\n');
  const r = s.jiu('check-stale', 'R-001');
  assert.equal(r.code, 4);
  assert.equal(rev(s, 'O-01', 'V1', 1).work, 'stale');
  assert.equal(rev(s, 'O-01', 'V1', 1).decision, 'preview');
  assert.equal(rev(s, 'O-02', 'V1', 1).work, 'proposed');
  assert.equal(s.jiu('decide', 'R-001', 'O-01/V1/r1', 'implement', '--quote', 'implement it').code, 3);
  assert.equal(s.jiu('fingerprint', 'R-001', 'O-01', '--revalidated', '--evidence', 'compatible').code, 0);
  assert.equal(rev(s, 'O-01', 'V1', 1).work, 'proposed');
});

test('missing or changed artifact shows up in validation', () => {
  const s = seeded();
  const f = path.join(s.state, 'runs', 'R-001', 'proposals', 'O-01', 'V1', 'r1.md');
  fs.appendFileSync(f, 'silent edit');
  fs.rmSync(path.join(s.state, 'runs', 'R-001', 'proposals', 'O-02', 'V1', 'r1.md'));
  const r = s.jiu('validate', 'R-001');
  assert.equal(r.code, 4);
  assert.match(r.out, /CHANGED proposal O-01\/V1\/r1/);
  assert.match(r.out, /MISSING proposal O-02\/V1\/r1/);
});

test('duplicate paid generation is blocked', () => {
  const s = seeded();
  const spec = ['--spec', 'higgsfield|seedance_2_5|hero loop|16:9', '--estimate', '10', '--ref', 'O-01/V1/r1'];
  assert.equal(s.jiu('media', 'R-001', 'claim', ...spec).code, 3);
  s.jiu('set', 'R-001', 'authorizations.media.authorized', 'true', '--quote', 'can spend up to 50');
  s.jiu('set', 'R-001', 'authorizations.media.limit', '50');
  const first = s.jiu('media', 'R-001', 'claim', ...spec);
  assert.match(first.out, /CLAIMED (\w+)/);
  const key = /CLAIMED (\w+)/.exec(first.out)[1];
  assert.equal(s.jiu('media', 'R-001', 'claim', ...spec).code, 3);
  fs.writeFileSync(path.join(s.state, 'runs', 'R-001', 'assets', 'hero.mp4'), 'x');
  assert.equal(s.jiu('media', 'R-001', 'done', '--key', key, '--path', 'assets/hero.mp4', '--cost', '10').code, 0);
  assert.match(s.jiu('media', 'R-001', 'claim', ...spec).out, /EXISTS/);
});

test('tasks touching the same files do not run in parallel', () => {
  const s = seeded();
  s.jiu('decide', 'R-001', 'O-01/V1/r1', 'implement', '--quote', 'O-01');
  s.jiu('decide', 'R-001', 'O-02/V1/r1', 'implement', '--quote', 'O-02');
  s.jiu('task', 'R-001', 'add', '--ref', 'O-01/V1/r1', '--files', 'src/Hero.tsx', 'src/tokens.css');
  s.jiu('task', 'R-001', 'add', '--ref', 'O-02/V1/r1', '--files', 'src/Cta.tsx', 'src/tokens.css');
  assert.equal(s.jiu('task', 'R-001', 'start', 'T-001').code, 0);
  assert.equal(s.jiu('task', 'R-001', 'start', 'T-002').code, 3);
  assert.match(s.jiu('validate', 'R-001').out, /IN_PROGRESS task T-001/);
});

test('lab events: preferring does not authorize, adjustment is recorded, invalid reference is rejected', () => {
  const s = seeded();
  s.jiu('decide', 'R-001', 'O-01/V1/r1', 'preview', '--quote', 'mock');
  const inbox = path.join(s.state, 'runs', 'R-001', 'events', 'inbox');
  fs.writeFileSync(path.join(inbox, '1.json'), JSON.stringify({ type: 'prefer', ref: 'O-01/V1/r1' }));
  fs.writeFileSync(path.join(inbox, '2.json'), JSON.stringify({ type: 'adjust', ref: 'O-01/V1/r1', text: 'less motion' }));
  fs.writeFileSync(path.join(inbox, '3.json'), JSON.stringify({ type: 'reject', ref: 'O-01/V9/r1' }));
  fs.writeFileSync(path.join(inbox, '4.json'), JSON.stringify({ type: 'reject', ref: 'O-02/V1/r1', text: 'does not fit' }));
  const r = s.jiu('events-ingest', 'R-001');
  assert.match(r.out, /REJECTED 3\.json/);
  const v = rev(s, 'O-01', 'V1', 1);
  assert.equal(v.preferred, true);
  assert.equal(v.decision, 'preview');
  assert.equal(v.feedback.length, 2);
  assert.equal(rev(s, 'O-02', 'V1', 1).decision, 'rejected');
  assert.match(s.jiu('events-ingest', 'R-001').out, /NO_EVENTS/);
});

test('keep original closes the opportunity without touching the others', () => {
  const s = seeded();
  assert.equal(s.jiu('decide', 'R-001', 'O-02', 'keep-original', '--quote', 'keep the original on O-02').code, 0);
  const o2 = opps(s).find((o) => o.id === 'O-02');
  assert.equal(o2.state, 'closed');
  assert.equal(o2.variants[0].revisions[0].decision, 'implement');
  assert.equal(opps(s).find((o) => o.id === 'O-01').state, 'open');
});

test('per-run limits are enforced', () => {
  const s = seeded();
  s.jiu('set', 'R-001', 'limits.maxVariantsPerOpportunity', '2');
  assert.equal(s.jiu('variant-add', 'R-001', 'O-01', '--name', 'Third', '--file', s.draft).code, 3);
  assert.equal(s.jiu('variant-add', 'R-001', 'O-01', '--name', 'Third', '--file', s.draft, '--over-limit').code, 0);
});

test('seasonal opportunities are opt-in and have their own limit', () => {
  const s = seeded();
  const add = (...extra) => s.jiu('opp-add', 'R-001', '--kind', 'seasonal', '--title', 'Hat on the logo', ...extra);
  assert.equal(add('--occasion', 'christmas').code, 3);
  assert.equal(s.jiu('set', 'R-001', 'seasonal.requested', 'true').code, 1);
  assert.equal(s.jiu('set', 'R-001', 'seasonal.requested', 'true', '--quote', 'quero detalhes de Natal').code, 0);
  assert.equal(add().code, 1);
  assert.equal(add('--occasion', 'christmas').code, 0);
  assert.equal(opps(s).find((o) => o.kind === 'seasonal').occasion, 'christmas');
  s.jiu('set', 'R-001', 'limits.maxOpportunities', '2');
  assert.equal(add('--occasion', 'halloween').code, 0);
  s.jiu('set', 'R-001', 'limits.maxSeasonalOpportunities', '2');
  assert.equal(add('--occasion', 'carnival').code, 3);
  assert.match(s.jiu('show', 'R-001').out, /\[seasonal: christmas\]/);
});

test('controller rulings are recorded and listed in order', () => {
  const s = seeded();
  assert.match(s.jiu('rulings', 'R-001').out, /NO_RULINGS/);
  assert.equal(s.jiu('ruling', 'R-001').code, 1);
  assert.equal(s.jiu('ruling', 'R-001', 'kept existing easing token', '--ref', 'O-01/V1/r1', '--cost', 'one extra review').code, 0);
  assert.equal(s.jiu('ruling', 'R-001', 'minor (deferred): label wraps at 320px', '--ref', 'T-001').code, 0);
  assert.equal(s.jiu('ruling', 'R-001', 'x', '--ref', 'O-09').code, 1);
  const out = s.jiu('rulings', 'R-001').out;
  assert.match(out, /1\. .*\[O-01\/V1\/r1\] kept existing easing token — if wrong: one extra review/);
  assert.match(out, /2\. .*\[T-001\] minor \(deferred\)/);
});

test('without --state, a jproject container keeps the state in its work folder', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jiu-container-'));
  const work = path.join(root, 'work');
  const product = path.join(root, 'product');
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(path.join(product, 'src'), { recursive: true });
  fs.writeFileSync(path.join(work, 'WORKSPACE.md'), '---\njproject: 1\nproduct_dir: product\nwork_dir: work\n---\n# map\n');
  fs.writeFileSync(path.join(product, 'WORKSPACE.md'), '# Product map\n');
  const env = { ...process.env };
  delete env.JIU_STATE;
  const r = spawnSync(process.execPath, [CLI, 'init', '--code', product], { encoding: 'utf8', cwd: product, env });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(fs.existsSync(path.join(work, '30-plan', 'juice-it-up', 'runs', 'R-001', 'run.json')));
  assert.ok(!fs.existsSync(path.join(product, '.juice-it-up')));
});
