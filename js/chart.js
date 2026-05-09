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
   * Cria ou atualiza o gráfico em moeda nominal futura.
   *
   * Curvas:
   *  • Laranja "Valor do veículo (FIPE + IPCA)": preço FIPE depreciando ano a
   *    ano e ajustado pelo IPCA. Representa o valor real do veículo no futuro.
   *  • Verde "Preço pago corrigido pelo IPCA": valor pago pelo usuário
   *    corrigido apenas pela inflação, sem depreciação. Aparece somente quando
   *    há preço de compra informado.
   *  • A diferença (verde − laranja) representa o "gasto real" do veículo —
   *    quanto o usuário efetivamente perdeu em termos reais.
   *
   * @param {string} canvasId — id do <canvas>
   * @param {number[]} serieDepreciacaoNominal — FIPE com IPCA + depreciação
   * @param {number[]|null} seriePagoCorrigido — preço pago corrigido pelo IPCA (ou null)
   * @param {number} [precoCompra=0] — desenha a curva verde se > 0
   */
  function renderizar(canvasId, serieDepreciacaoNominal, seriePagoCorrigido, precoCompra = 0) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Destruir instância anterior para evitar memory leak
    if (_instance) {
      _instance.destroy();
      _instance = null;
    }

    const ctx = canvas.getContext('2d');
    const labels = serieDepreciacaoNominal.map((_, i) => i === 0 ? 'Hoje' : `Ano ${i}`);

    // Gradientes
    const gradVeiculo = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight || 400);
    gradVeiculo.addColorStop(0, 'rgba(242, 92, 5, 0.3)');
    gradVeiculo.addColorStop(1, 'rgba(242, 92, 5, 0.0)');

    const gradPago = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight || 400);
    gradPago.addColorStop(0, 'rgba(46, 204, 113, 0.18)');
    gradPago.addColorStop(1, 'rgba(46, 204, 113, 0.0)');

    // Cores do design system
    const colors = {
      veiculo:       '#F25C05',
      pago:          '#2ECC71',
      grid:          'rgba(255, 255, 255, 0.04)',
      text:          '#7E7E9A',
      tooltipBg:     '#1A1A26',
      tooltipBorder: 'rgba(255, 255, 255, 0.08)'
    };

    const datasets = [
      {
        label: 'Valor do veículo (FIPE + IPCA)',
        data: serieDepreciacaoNominal,
        borderColor: colors.veiculo,
        backgroundColor: gradVeiculo,
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: colors.veiculo,
        pointBorderColor: '#0A0A10',
        pointBorderWidth: 2,
        order: 1
      }
    ];

    if (precoCompra > 0 && Array.isArray(seriePagoCorrigido)) {
      datasets.push({
        label: 'Preço pago corrigido pelo IPCA',
        data: seriePagoCorrigido,
        borderColor: colors.pago,
        backgroundColor: gradPago,
        borderWidth: 2,
        borderDash: [6, 4],
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: colors.pago,
        pointBorderColor: '#0A0A10',
        pointBorderWidth: 2,
        order: 2
      });
    }

    _instance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets
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
