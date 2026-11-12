// 验证教学实验的因果方向与边界；不把 DOM 测试当作视觉验收。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', error => errors.push(error.message));
const dom = new JSDOM(fs.readFileSync('content/ai/bias_variance_mse_gepa_guide_derivation_expanded.html', 'utf8'), { runScripts: 'dangerously', virtualConsole: vc });
const doc = dom.window.document;
function set(id, value) {
  const node = doc.getElementById(id);
  assert.ok(node, `缺少实验控件 ${id}`);
  node.value = value;
  node.dispatchEvent(new dom.window.Event('input'));
}
const num = id => Number(doc.getElementById(id).textContent);
assert.ok(doc.getElementById('framework'), '先给出完整评测框架');
assert.ok(doc.getElementById('freshVal'), '实验必须展示独立复测');
set('bRange', 0); set('rhoRange', 0); set('nRange', 20); set('cRange', 20);
const baseline = num('optimismVal');
assert.ok(baseline > 0);
assert.equal(num('fixedVal'), 80);
assert.equal(num('freshVal'), 80);
set('nRange', 400);
assert.ok(num('optimismVal') < baseline, '增加样本量应降低选择乐观量');
set('nRange', 20); set('cRange', 100);
assert.ok(num('optimismVal') > baseline, '同能力候选更多时最大噪声更大');
set('cRange', 1);
assert.equal(num('optimismVal'), 0, '只有一个候选时不存在择优带来的额外乐观');
set('cRange', 20); set('rhoRange', 100);
assert.equal(num('optimismVal'), 0, '完全共同噪声不会产生择优乐观');
assert.ok(num('seVal') > 0, '共同噪声仍产生绝对分数波动');
set('rhoRange', 0); set('bRange', 5);
assert.equal(num('fixedVal'), 85);
assert.equal(num('freshVal'), 85, '独立复测不能消除相同评分尺的固定偏移');
assert.ok(Math.abs(num('optimismVal') - baseline) < 0.02, '共同固定偏移不改变选择附加量');
const oldRound = doc.getElementById('roundLabel').textContent;
doc.getElementById('nextRound').click();
assert.notEqual(doc.getElementById('roundLabel').textContent, oldRound);
for (const preset of doc.querySelectorAll('[data-preset]')) {
  preset.click();
  for (const id of ['seVal','winnerVal','optimismVal','freshVal']) assert.ok(Number.isFinite(num(id)));
}
for (const a of doc.querySelectorAll('a[href^="#"]')) assert.ok(doc.getElementById(a.hash.slice(1)), `失效锚点 ${a.hash}`);
assert.equal(new Set([...doc.querySelectorAll('[id]')].map(e => e.id)).size, doc.querySelectorAll('[id]').length);
assert.deepEqual(errors, []);
dom.window.close();
console.log('PASS：整体框架、独立复测、样本量/候选数/相关性/偏移边界、预设、轮次与锚点检查');
