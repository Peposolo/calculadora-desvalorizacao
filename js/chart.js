const DepreciationChart = (() => {
  let _instance = null;

  function _formatBRL(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
  }

  function renderizar(canvasId, sD, sI) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (_instance) { _instance.destroy(); _instance = null; }
    const ctx = canvas.getContext('2d');
    const labels = sD.map((_, i) => i === 0 ? 'Hoje' : `Ano ${i}`);
    const h = canvas.parentElement.clientHeight || 400;
    const gD = ctx.createLinearGradient(0, 0, 0, h);
    gD.addColorStop(0, 'rgba(242,92,5,0.3)'); gD.addColorStop(1, 'rgba(242,92,5,0)');
    const gI = ctx.createLinearGradient(0, 0, 0, h);
    gI.addColorStop(0, 'rgba(99,99,128,0.15)'); gI.addColorStop(1, 'rgba(99,99,128,0)');
    const c = { dep: '#F25C05', inf: '#636380', grid: 'rgba(255,255,255,0.04)', text: '#7E7E9A', tbg: '#1A1A26', tb: 'rgba(255,255,255,0.08)' };
    _instance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Valor do Ve\u00edculo (Deprecia\u00e7\u00e3o)', data: sD, borderColor: c.dep, backgroundColor: gD, borderWidth: 3, fill: true, tension: .35, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: c.dep, pointBorderColor: '#0A0A10', pointBorderWidth: 2, order: 1 },
          { label: 'Valor Corrigido (IPCA)', data: sI, borderColor: c.inf, backgroundColor: gI, borderWidth: 2, borderDash: [6,4], fill: true, tension: .35, pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: c.inf, pointBorderColor: '#0A0A10', pointBorderWidth: 2, order: 2 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', align: 'end', labels: { color: c.text, font: { family: "'Inter',sans-serif", size: 12, weight: '500' }, boxWidth: 12, boxHeight: 3, borderRadius: 2, useBorderRadius: true, padding: 16 } },
          tooltip: { backgroundColor: c.tbg, borderColor: c.tb, borderWidth: 1, titleColor: '#EDEDF4', bodyColor: '#EDEDF4', titleFont: { family: "'Inter',sans-serif", size: 13, weight: '700' }, bodyFont: { family: "'Inter',sans-serif", size: 12 }, padding: 12, cornerRadius: 10, displayColors: true, callbacks: { label: ctx => `${ctx.dataset.label}: ${_formatBRL(ctx.parsed.y)}` } }
        },
        scales: {
          x: { grid: { color: c.grid, drawBorder: false }, ticks: { color: c.text, font: { family: "'Inter',sans-serif", size: 11 } } },
          y: { grid: { color: c.grid, drawBorder: false }, ticks: { color: c.text, font: { family: "'Inter',sans-serif", size: 11 }, callback: v => v >= 1e6 ? `R$ ${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v/1e3).toFixed(0)}k` : `R$ ${v}` } }
        }
      }
    });
  }

  function destruir() { if (_instance) { _instance.destroy(); _instance = null; } }
  return { renderizar, destruir };
})();
