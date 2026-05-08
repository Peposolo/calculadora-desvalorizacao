/* ═══════════════════════════════════════════════════════════════
   chart.js — Configuração e renderização do Chart.js
   ═══════════════════════════════════════════════════════════════ */

const DepreciationChart = (() => {

  /** @type {Chart|null} */
  let _instance = null;

  /**
   * Formata valor em BRL para tooltip.
   */
  function _formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Cria ou atualiza o gráfico de depreciação vs inflação.
   * @param {string} canvasId — id do <canvas>
   * @param {number[]} serieDepreciacao — valores ano a ano
   * @param {number[]} serieInflacao — valores ano a ano
   */
  function renderizar(canvasId, serieDepreciacao, serieInflacao) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Destruir instância anterior para evitar memory leak
    if (_instance) {
      _instance.destroy();
      _instance = null;
    }

    const ctx = canvas.getContext('2d');
    const labels = serieDepreciacao.map((_, i) => i === 0 ? 'Hoje' : `Ano ${i}`);

    // Gradientes
    const gradDepreciation = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight || 400);
    gradDepreciation.addColorStop(0, 'rgba(242, 92, 5, 0.3)');
    gradDepreciation.addColorStop(1, 'rgba(242, 92, 5, 0.0)');

    const gradInflation = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight || 400);
    gradInflation.addColorStop(0, 'rgba(99, 99, 128, 0.15)');
    gradInflation.addColorStop(1, 'rgba(99, 99, 128, 0.0)');

    // Cores do design system
    const colors = {
      depreciation:  '#F25C05',
      inflation:     '#636380',
      grid:          'rgba(255, 255, 255, 0.04)',
      text:          '#7E7E9A',
      tooltipBg:     '#1A1A26',
      tooltipBorder: 'rgba(255, 255, 255, 0.08)'
    };

    _instance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Valor FIPE (Depreciação)',
            data: serieDepreciacao,
            borderColor: colors.depreciation,
            backgroundColor: gradDepreciation,
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: colors.depreciation,
            pointBorderColor: '#0A0A10',
            pointBorderWidth: 2,
            order: 1
          },
          {
            label: 'Valor Corrigido (IPCA)',
            data: serieInflacao,
            borderColor: colors.inflation,
            backgroundColor: gradInflation,
            borderWidth: 2,
            borderDash: [6, 4],
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: colors.inflation,
            pointBorderColor: '#0A0A10',
            pointBorderWidth: 2,
            order: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: colors.text,
              font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
              boxWidth: 12,
              boxHeight: 3,
              borderRadius: 2,
              useBorderRadius: true,
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleColor: '#EDEDF4',
            bodyColor: '#EDEDF4',
            titleFont: { family: "'Inter', sans-serif", size: 13, weight: '700' },
            bodyFont: { family: "'Inter', sans-serif", size: 12 },
            padding: 12,
            cornerRadius: 10,
            displayColors: true,
            callbacks: {
              label: function(ctx) {
                return `${ctx.dataset.label}: ${_formatBRL(ctx.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: "'Inter', sans-serif", size: 11 }
            }
          },
          y: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: "'Inter', sans-serif", size: 11 },
              callback: function(value) {
                if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000)    return `R$ ${(value / 1000).toFixed(0)}k`;
                return `R$ ${value}`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Destrói a instância do gráfico.
   */
  function destruir() {
    if (_instance) {
      _instance.destroy();
      _instance = null;
    }
  }

  return { renderizar, destruir };
})();
