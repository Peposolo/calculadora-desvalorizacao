/* ═══════════════════════════════════════════════════════════════
   calculator.js — Funções puras de cálculo (depreciação + inflação)
   ═══════════════════════════════════════════════════════════════ */

const Calculator = (() => {

  /**
   * Taxas de depreciação base por faixa de idade do veículo (ano a ano).
   * Fonte: médias históricas da Tabela FIPE.
   */
  function _getTaxaBase(anoIndex) {
    if (anoIndex === 1)  return 0.15;  // 1º ano: 15%
    if (anoIndex === 2)  return 0.10;  // 2º ano: 10%
    if (anoIndex === 3)  return 0.08;  // 3º ano: 8%
    if (anoIndex <= 6)   return 0.06;  // 4º–6º: 6%
    if (anoIndex <= 10)  return 0.04;  // 7º–10º: 4%
    return 0.02;                       // 11º+: 2%
  }

  /**
   * Calcula o ajuste na taxa de depreciação baseado nos parâmetros opcionais.
   * @param {Object} ajustes
   * @param {number} [ajustes.kmAnual=12000]
   * @param {'excelente'|'bom'|'regular'|'ruim'} [ajustes.conservacao='bom']
   * @returns {number} — ajuste aditivo (pode ser negativo)
   */
  function _getAjuste(ajustes = {}) {
    let delta = 0;

    // Quilometragem
    const km = ajustes.kmAnual || 12000;
    if (km > 25000) delta += 0.02;
    else if (km > 15000) delta += 0.01;
    else if (km < 8000) delta -= 0.005;

    // Conservação
    const cons = ajustes.conservacao || 'bom';
    if (cons === 'excelente') delta -= 0.01;
    else if (cons === 'regular') delta += 0.01;
    else if (cons === 'ruim') delta += 0.02;

    return delta;
  }

  /**
   * Calcula a série de valores depreciados ano a ano.
   * Utiliza o preço FIPE como valor base para a depreciação.
   * @param {number} precoFipe — valor FIPE atual do veículo
   * @param {number} anos — quantidade de anos a projetar
   * @param {Object} [ajustes] — parâmetros opcionais
   * @returns {number[]} — array de (anos+1) valores: [valor_ano0, valor_ano1, ..., valor_anoN]
   */
  function calcularDepreciacao(precoFipe, anos, ajustes = {}) {
    const ajusteDelta = _getAjuste(ajustes);
    const serie = [precoFipe];

    for (let i = 1; i <= anos; i++) {
      const taxaBase = _getTaxaBase(i);
      const taxaFinal = Math.max(0, Math.min(1, taxaBase + ajusteDelta));
      const valorAnterior = serie[i - 1];
      serie.push(valorAnterior * (1 - taxaFinal));
    }

    return serie;
  }

  /**
   * Calcula a série de valores corrigidos pela inflação (IPCA).
   * Utiliza o preço FIPE como valor base.
   * @param {number} precoFipe — valor FIPE atual do veículo
   * @param {number} anos
   * @param {number} taxaIpca — taxa anual como decimal (ex: 0.045 = 4,5%)
   * @returns {number[]}
   */
  function calcularInflacao(precoFipe, anos, taxaIpca) {
    const serie = [precoFipe];

    for (let i = 1; i <= anos; i++) {
      serie.push(precoFipe * Math.pow(1 + taxaIpca, i));
    }

    return serie;
  }

  /**
   * Gera o resumo completo dos cálculos.
   * A depreciação e inflação são baseadas no preço FIPE.
   * O preço de compra é usado apenas para comparação.
   * @param {number[]} serieDepreciacao — baseada no preço FIPE
   * @param {number[]} serieInflacao — baseada no preço FIPE
   * @param {number} precoFipe — valor FIPE atual
   * @param {number} precoCompra — valor pago pelo comprador (pode ser 0)
   * @returns {Object}
   */
  function calcularResumo(serieDepreciacao, serieInflacao, precoFipe, precoCompra) {
    const anos = serieDepreciacao.length - 1;
    const valorFinal = serieDepreciacao[anos];
    const valorCorrigido = serieInflacao[anos];

    // Perda de valor FIPE (depreciação do mercado)
    const perdaFipeNominal = precoFipe - valorFinal;
    const perdaFipePercentual = precoFipe > 0 ? (perdaFipeNominal / precoFipe) * 100 : 0;

    // Perda real vs inflação
    const perdaReal = valorCorrigido - valorFinal;

    // Comparação com preço de compra: economia ou prejuízo
    // Positivo = comprou abaixo da FIPE (economia), Negativo = comprou acima (prejuízo)
    const diferencaCompra = precoFipe - precoCompra;

    return {
      precoFipe,
      precoCompra,
      anos,
      valorFinal,
      valorCorrigido,
      perdaFipeNominal,
      perdaFipePercentual,
      perdaReal,
      diferencaCompra,
      serieDepreciacao,
      serieInflacao
    };
  }

  /**
   * Gera os dados para a tabela ano-a-ano.
   * A perda acumulada é baseada no valor FIPE (não no preço de compra).
   * @param {number[]} serieDepreciacao — baseada no preço FIPE
   * @param {number[]} serieInflacao — baseada no preço FIPE
   * @param {number} precoFipe — valor FIPE atual
   * @returns {{ano: number, depreciado: number, corrigido: number, perdaNoAno: number, perdaAcumulada: number}[]}
   */
  function gerarTabelaAnual(serieDepreciacao, serieInflacao, precoFipe) {
    const linhas = [];

    for (let i = 1; i < serieDepreciacao.length; i++) {
      linhas.push({
        ano: i,
        depreciado: serieDepreciacao[i],
        corrigido: serieInflacao[i],
        perdaNoAno: serieDepreciacao[i - 1] - serieDepreciacao[i],
        perdaAcumulada: precoFipe - serieDepreciacao[i]
      });
    }

    return linhas;
  }

  return {
    calcularDepreciacao,
    calcularInflacao,
    calcularResumo,
    gerarTabelaAnual
  };
})();
