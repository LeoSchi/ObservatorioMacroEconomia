// ============ DADOS OFICIAIS (IBGE · SIDRA 7060 · Boletim IPCA set/2026, publicado em 09/10/2026) ============
// Variação mensal (%). 2023 entra só como base para o acumulado em 12 meses.
const IPCA_GERAL = {
  2023: [0.53,0.84,0.71,0.61,0.23,-0.08,0.12,0.23,0.26,0.24,0.28,0.56],
  2024: [0.42,0.83,0.16,0.38,0.46,0.21,0.38,-0.02,0.44,0.56,0.39,0.52],
  2025: [0.16,1.31,0.56,0.43,0.26,0.24,0.26,-0.11,0.48,0.09,0.18,0.33],
  2026: [0.33,0.70,0.88,0.67,0.58,0.16,0.07,-0.32,0.82]
};
const IPCA_ALIM = {
  2023: [0.59,0.16,0.05,0.71,0.16,-0.66,-0.46,-0.85,-0.71,0.31,0.63,1.11],
  2024: [1.38,0.95,0.53,0.70,0.62,0.44,-1.00,-0.44,0.50,1.06,1.55,1.18],
  2025: [0.96,0.70,1.17,0.82,0.17,-0.18,-0.27,-0.46,-0.26,0.01,-0.01,0.27],
  2026: [0.23,0.26,1.56,1.34,1.33,-0.24,-0.67,-0.34,0.83]
};
// PNAD Contínua: rendimento médio real habitual (todos os trabalhos), trimestre móvel encerrado no mês.
// v = R$ divulgado na edição; aa = variação real sobre o mesmo trimestre do ano anterior (%).
const RENDA = {
  '2024-11': {v:3285, aa:3.4}, '2025-1': {v:3378, aa:3.6}, '2025-2': {v:3410, aa:4.0},
  '2025-10': {v:3574, aa:4.5}, '2025-11': {v:3613, aa:5.0}, '2026-0': {v:3652, aa:5.4},
  '2026-2': {v:3722, aa:5.5}, '2026-3': {v:3732, aa:5.3}, '2026-4': {v:3726, aa:4.0},
  '2026-5': {v:3738, aa:2.8}, '2026-7': {v:3777, aa:3.7}, '2026-8': {v:3790, aa:3.6}
};
const MES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ============ CÁLCULOS ============
const comp = a => (a.reduce((p, x) => p * (1 + x / 100), 1) - 1) * 100;
const f = (n, d = 2) => n.toFixed(d).replace('.', ',');
const sg = (n, d = 2) => (n > 0 ? '+' : '') + f(n, d);

const all = [];
[2023, 2024, 2025, 2026].forEach(y => IPCA_GERAL[y].forEach((g, m) => all.push({ y, m, g, a: IPCA_ALIM[y][m] })));
all.forEach((r, i) => {
  r.periodo = `${MES[r.m]}/${String(r.y).slice(2)}`;
  r.dif = r.a - r.g;
  if (i >= 11) {
    r.g12 = comp(all.slice(i - 11, i + 1).map(x => x.g));
    r.a12 = comp(all.slice(i - 11, i + 1).map(x => x.a));
    const inc = RENDA[`${r.y}-${r.m}`];
    if (inc) {
      r.renda = inc.v; r.rendaAA = inc.aa;
      // Aproximação do autor: renda real (deflator IPCA geral) reexpressa em preços de alimentos
      r.rendaAli = ((1 + inc.aa / 100) * (1 + r.g12 / 100) / (1 + r.a12 / 100) - 1) * 100;
    }
  }
});
const rows = all.filter(r => r.y >= 2024);
let periodo = 'todos', charts = {};

const sel = p => p === 'todos' ? rows : rows.filter(r => String(r.y) === p);

// ============ INTERFACE ============
const TABS = ['dashboard', 'analise', 'metodologia', 'dados', 'fontes', 'autor'];
function switchTab(id, push = true) {
  if (!TABS.includes(id)) id = 'dashboard';
  document.querySelectorAll('.tab-content').forEach(e => e.classList.toggle('active', e.id === 'tab-' + id));
  document.querySelectorAll('.nav-btn').forEach(b => {
    const on = b.dataset.tab === id;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on);
  });
  if (push) history.replaceState(null, '', '#' + id);
  if (id === 'analise') renderStatic();
  if (id === 'dashboard') renderCharts(sel(periodo));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function setPeriod(p, btn) {
  periodo = p;
  document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
  btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
  update();
}

function update() {
  const d = sel(periodo);
  const A = comp(d.map(r => r.a)), G = comp(d.map(r => r.g)), D = A - G;
  const acima = d.filter(r => r.dif > 0).length;
  const last = d[d.length - 1], inc = [...d].reverse().find(r => r.renda);
  const rotulo = periodo === 'todos' ? 'jan/24 a set/26' : periodo === '2026' ? 'jan a set/26' : 'ano de ' + periodo;
  document.getElementById('kpi-ali').textContent = f(A) + '%';
  document.getElementById('kpi-geral').textContent = f(G) + '%';
  document.getElementById('kpi-diff').textContent = sg(D) + ' p.p.';
  document.getElementById('kpi-ali-foot').textContent = `Acumulado em ${rotulo}`;
  document.getElementById('kpi-geral-foot').textContent = `Acumulado em ${rotulo}`;
  const dd = document.getElementById('kpi-diff-foot');
  dd.textContent = D > 0 ? '▲ Alimentos subiram mais que o índice geral' : '▼ Alimentos subiram menos que o índice geral';
  dd.className = 'kpi-foot ' + (D > 0 ? 'warning' : 'positive');
  document.getElementById('kpi-renda').textContent = inc ? 'R$ ' + inc.renda.toLocaleString('pt-BR') : '—';
  document.getElementById('kpi-renda-foot').textContent = inc ? `${sg(inc.rendaAA, 1)}% a/a real · trimestre encerrado em ${inc.periodo}` : 'Sem divulgação verificada no período';
  document.getElementById('insight').innerHTML =
    `<strong>Leitura do período (${rotulo}):</strong> a alimentação acumulou <strong>${f(A)}%</strong> contra <strong>${f(G)}%</strong> do IPCA geral, ` +
    `${Math.abs(D) < 0.005 ? 'praticamente igual' : f(Math.abs(D)) + ' p.p. ' + (D > 0 ? 'acima' : 'abaixo')}. ` +
    `Em ${acima} de ${d.length} meses os alimentos subiram mais que o índice geral.` +
    (inc ? ` O rendimento real mais recente do período é de R$ ${inc.renda.toLocaleString('pt-BR')}.` : '');
  renderCharts(d);
  renderTable();
}

// ============ GRÁFICOS ============
const COR = { ali: '#fbbf24', ger: '#38bdf8', ren: '#34d399' };
Chart.defaults.color = '#9aa6c1';
Chart.defaults.font.family = "Inter, system-ui, sans-serif";
Chart.defaults.borderColor = 'rgba(148,163,184,.15)';
Chart.defaults.animation = { duration: 350 };
Chart.defaults.transitions.resize = { animation: { duration: 0 } };
function mk(id, cfg) {
  if (charts[id]) charts[id].destroy();
  cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false } }, cfg.options);
  charts[id] = new Chart(document.getElementById(id).getContext('2d'), cfg);
}
const pct = { callbacks: { label: c => `${c.dataset.label}: ${f(c.parsed.y ?? c.parsed.x)}%` } };
const yTitle = t => ({ y: { title: { display: true, text: t }, grid: { color: 'rgba(148,163,184,.15)' } }, x: { grid: { display: false } } });

function renderCharts(d) {
  if (!document.getElementById('chartComparativo').offsetParent) return;
  const L = d.map(r => r.periodo);
  const line = (label, data, c, fill) => ({ label, data, borderColor: c, backgroundColor: c + '22', tension: .3, borderWidth: 2, pointRadius: d.length > 15 ? 0 : 3, fill });
  mk('chartComparativo', { type: 'line', data: { labels: L, datasets: [line('Alimentação e bebidas', d.map(r => r.a), COR.ali, true), line('IPCA geral', d.map(r => r.g), COR.ger, false)] }, options: { scales: yTitle('Variação mensal (%)'), plugins: { tooltip: pct } } });
  mk('chart12m', { type: 'line', data: { labels: L, datasets: [line('Alimentação e bebidas', d.map(r => r.a12), COR.ali, false), line('IPCA geral', d.map(r => r.g12), COR.ger, false)] }, options: { scales: yTitle('Acumulado em 12 meses (%)'), plugins: { tooltip: pct } } });
  mk('chartDif', { type: 'bar', data: { labels: L, datasets: [{ label: 'Alimentação − IPCA geral (p.p.)', data: d.map(r => +r.dif.toFixed(2)), backgroundColor: d.map(r => r.dif > 0 ? COR.ali : COR.ren) }] }, options: { scales: yTitle('Diferencial (p.p.)'), plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `Diferencial: ${sg(c.parsed.y)} p.p.` } } } } });
  const p = d.filter(r => r.renda);
  mk('chartRenda', { type: 'bar', data: { labels: p.map(r => r.periodo), datasets: [
    { label: 'Renda real a/a (deflator: IPCA geral)', data: p.map(r => r.rendaAA), backgroundColor: COR.ger },
    { label: 'Renda a/a em poder de compra de alimentos*', data: p.map(r => +r.rendaAli.toFixed(2)), backgroundColor: COR.ali }] },
    options: { scales: yTitle('Variação em 12 meses (%)'), plugins: { tooltip: pct } } });
}

function renderStatic() {
  const anos = [2024, 2025, 2026];
  mk('chartAnual', { type: 'bar', data: { labels: ['2024', '2025', '2026 (jan–set)'], datasets: [
    { label: 'Alimentação e bebidas', data: anos.map(y => +comp(IPCA_ALIM[y]).toFixed(2)), backgroundColor: COR.ali },
    { label: 'IPCA geral', data: anos.map(y => +comp(IPCA_GERAL[y]).toFixed(2)), backgroundColor: COR.ger }] },
    options: { scales: yTitle('Acumulado no ano (%)'), plugins: { tooltip: pct } } });
  // IBGE, IPCA set/2026 — variação acumulada no ano (jan–set/26) por subgrupo de alimentação
  const sub = [['Tubérculos, raízes e legumes', 46.54], ['Leite e derivados', 12.47], ['Cereais e leguminosas', 10.74], ['Hortaliças e verduras', 10.48], ['Carnes', 6.89], ['Alimentação fora do domicílio', 4.20], ['Açúcares e derivados', -1.24], ['Bebidas e infusões', -3.37], ['Aves e ovos', -4.99], ['Óleos e gorduras', -5.65]];
  mk('chartSub', { type: 'bar', data: { labels: sub.map(s => s[0]), datasets: [{ label: 'Acumulado jan–set/26 (%)', data: sub.map(s => s[1]), backgroundColor: sub.map(s => s[1] > 0 ? COR.ali : COR.ren) }] },
    options: { indexAxis: 'y', scales: { x: { title: { display: true, text: '%' }, grid: { color: 'rgba(148,163,184,.15)' } } }, plugins: { legend: { display: false }, tooltip: pct } } });
}

// ============ TABELAS E CSV ============
function renderTable() {
  const d = document.getElementById('filtro-ano').value;
  const dados = sel(d);
  document.querySelector('#tabela-dados tbody').innerHTML = dados.map(r => `<tr>
    <td><strong>${r.periodo}</strong></td><td class="num">${f(r.g)}%</td>
    <td class="num"><span class="pos">${f(r.a)}%</span></td>
    <td class="num ${r.dif > 0 ? 'pos' : 'neg'}">${sg(r.dif)}</td>
    <td class="num">${f(r.g12)}%</td><td class="num">${f(r.a12)}%</td>
    <td class="num">${r.renda ? 'R$ ' + r.renda.toLocaleString('pt-BR') + ' (' + sg(r.rendaAA, 1) + '%)' : '—'}</td></tr>`).join('');
  document.querySelector('#tabela-anual tbody').innerHTML = [2024, 2025, 2026].map(y => {
    const A = comp(IPCA_ALIM[y]), G = comp(IPCA_GERAL[y]);
    return `<tr><td><strong>${y}${y === 2026 ? ' (jan–set)' : ''}</strong></td><td class="num">${f(G)}%</td><td class="num">${f(A)}%</td><td class="num ${A > G ? 'pos' : 'neg'}">${sg(A - G)}</td></tr>`;
  }).join('');
}

function baixarCSV() {
  const h = 'periodo;ipca_geral_mensal;ipca_alimentacao_mensal;diferencial_pp;ipca_geral_12m;ipca_alimentacao_12m;renda_real_R$;renda_real_aa_pct';
  const l = rows.map(r => [r.periodo, r.g, r.a, r.dif.toFixed(2), r.g12.toFixed(2), r.a12.toFixed(2), r.renda ?? '', r.rendaAA ?? ''].join(';').replace(/\./g, ','));
  const b = new Blob(['\ufeff' + [h, ...l].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(b), download: 'observatorio-macro-dados.csv' });
  a.click(); URL.revokeObjectURL(a.href);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  document.getElementById('filtro-ano').addEventListener('change', renderTable);
  window.addEventListener('hashchange', () => switchTab(location.hash.slice(1), false));
  update();
  switchTab(location.hash.slice(1) || 'dashboard', false);
});
