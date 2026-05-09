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
   * Calcula a série de valores depreciados ano a ano a partir do preço FIPE.
   * O valor real do carro é dado pela tabela FIPE — independentemente do que
   * o usuário pagou — então a curva de depreciação sempre parte de precoFipe.
   * @param {number} precoFipe — valor FIPE atual do veículo
   * @param {number} anos — quantidade de anos a projetar
   * @param {Object} [ajustes] — parâmetros opcionais (km, conservação)
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
   * Calcula a série do preço pago corrigido pela inflação (IPCA), ano a ano.
   * Útil como "linha de comparação" no gráfico — representa quanto o dinheiro
   * pago pelo veículo valeria hoje em moeda corrente futura, sem depreciação.
   * @param {number} precoCompra — valor pago pelo comprador
   * @param {number} anos
   * @param {number} taxaIpca
   * @returns {number[]}
   */
  function calcularValorPagoCorrigido(precoCompra, anos, taxaIpca) {
    const serie = [precoCompra];
    for (let i = 1; i <= anos; i++) {
      serie.push(precoCompra * Math.pow(1 + taxaIpca, i));
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
   * Aplica inflação a cada índice de uma série: serie[i] * (1 + ipca)^i.
   * Útil para converter valores em "moeda atual" para "moeda nominal futura".
   * @param {number[]} serie
   * @param {number} taxaIpca
   * @returns {number[]}
   */
  function aplicarInflacao(serie, taxaIpca) {
    return serie.map((v, i) => v * Math.pow(1 + taxaIpca, i));
  }

  /**
   * Gera o resumo completo dos cálculos.
   *
   * Modelo: o valor real do veículo é a tabela FIPE — então a curva de
   * depreciação sempre parte de precoFipe e sofre depreciação + inflação.
   * Para comparação, traçamos o preço pago pelo usuário corrigido pela
   * inflação (sem depreciação). A diferença entre as duas representa o
   * "gasto real" do veículo: quanto o usuário efetivamente perdeu em
   * termos reais ao longo do tempo.
   *
   * @param {number[]} serieDepreciacao — depreciação real do FIPE em moeda atual
   * @param {number} precoFipe — valor FIPE atual do veículo
   * @param {number} precoCompra — valor pago pelo comprador (> 0 no fluxo normal)
   * @param {number} taxaIpca — taxa IPCA anual (decimal)
   * @returns {Object}
   */
  function calcularResumo(serieDepreciacao, precoFipe, precoCompra, taxaIpca) {
    const anos = serieDepreciacao.length - 1;
    // No fluxo normal, o formulário exige preço positivo. Esta normalização
    // mantém uma proteção defensiva caso a função seja chamada diretamente
    // com valores vazios, não numéricos ou negativos.
    const precoCompraSeguro = Number.isFinite(precoCompra) && precoCompra > 0 ? precoCompra : 0;
    const temCompra = precoCompraSeguro > 0;

    // Curva do valor do veículo em moeda nominal futura (FIPE + depreciação + IPCA)
    const serieDepreciacaoNominal = aplicarInflacao(serieDepreciacao, taxaIpca);

    // Curva do preço pago corrigido pela inflação (sem depreciação)
    const seriePagoCorrigido = temCompra
      ? calcularValorPagoCorrigido(precoCompraSeguro, anos, taxaIpca)
      : null;

    // Valores no instante final
    const valorFinalNominal = serieDepreciacaoNominal[anos];   // valor real do veículo após N anos
    const valorPagoFinal = temCompra ? seriePagoCorrigido[anos] : 0;

    // ─── Variação ATUAL (no momento da compra, vs. FIPE) ────────────────
    // Compara o quanto o usuário pagou frente ao preço FIPE atual.
    // Positivo = pago abaixo da FIPE (economia); negativo = pago acima (prejuízo).
    const variacaoAtual = temCompra ? precoFipe - precoCompraSeguro : 0;
    const variacaoAtualPercentual = (temCompra && precoFipe > 0)
      ? (variacaoAtual / precoFipe) * 100
      : 0;

    // ─── Variação APÓS AJUSTE (após N anos, ajustado pelo IPCA + depreciação) ─
    // Compara o valor real do veículo (FIPE depreciada + IPCA) com o preço pago
    // corrigido pelo IPCA (sem depreciação) — ambos em moeda nominal futura.
    // Positivo = veículo vale mais que o pago corrigido (raro); negativo = perda real.
    const variacaoAposAjuste = temCompra ? valorFinalNominal - valorPagoFinal : 0;
    const variacaoAposAjustePercentual = (temCompra && valorPagoFinal > 0)
      ? (variacaoAposAjuste / valorPagoFinal) * 100
      : 0;

    // Aliases semânticos: as badges usam os mesmos números das variações.
    const diferencaInicial = variacaoAtual;
    const diferencaFinal = variacaoAposAjuste;

    // Gasto real: ângulo invertido da diferenca final, útil para a tabela.
    // Positivo = dinheiro pago corrigido valeria mais que o veículo (perda real).
    const gastoReal = temCompra ? valorPagoFinal - valorFinalNominal : 0;

    return {
      precoFipe,
      precoCompra: precoCompraSeguro,
      temCompra,
      anos,
      taxaIpca,
      valorFinalNominal,
      valorPagoFinal,
      variacaoAtual,
      variacaoAtualPercentual,
      variacaoAposAjuste,
      variacaoAposAjustePercentual,
      diferencaInicial,
      diferencaFinal,
      gastoReal,
      serieDepreciacao,
      serieDepreciacaoNominal,
      seriePagoCorrigido
    };
  }

  /**
   * Gera os dados para a tabela ano-a-ano espelhando exatamente as duas curvas
   * do gráfico (FIPE depreciado em moeda nominal + preço pago corrigido pelo IPCA).
   * Convenção de sinais: positivo = ganho/crescimento, negativo = perda.
   *
   * @param {number[]} serieDepreciacaoNominal — valor do veículo (FIPE + IPCA + depreciação)
   * @param {number[]|null} seriePagoCorrigido — preço pago corrigido (null/zeros se sem compra)
   * @param {number} precoFipe — referência para a coluna "Variação Total"
   * @returns {{ano: number, valorFipe: number, pagoCorrigido: number|null, variacaoNoAno: number, variacaoTotal: number, gastoReal: number|null}[]}
   */
  function gerarTabelaAnual(serieDepreciacaoNominal, seriePagoCorrigido, precoFipe) {
    const linhas = [];
    const temCompra = Array.isArray(seriePagoCorrigido) && seriePagoCorrigido[0] > 0;

    for (let i = 1; i < serieDepreciacaoNominal.length; i++) {
      linhas.push({
        ano: i,
        valorFipe: serieDepreciacaoNominal[i],
        pagoCorrigido: temCompra ? seriePagoCorrigido[i] : null,
        variacaoNoAno: serieDepreciacaoNominal[i] - serieDepreciacaoNominal[i - 1],
        variacaoTotal: serieDepreciacaoNominal[i] - precoFipe,
        // Gasto real anual = preço pago inflado − valor do veículo no ano
        // (positivo = perda real; negativo = ganho real)
        gastoReal: temCompra ? seriePagoCorrigido[i] - serieDepreciacaoNominal[i] : null
      });
    }

    return linhas;
  }

  return {
    calcularDepreciacao,
    calcularInflacao,
    calcularValorPagoCorrigido,
    aplicarInflacao,
    calcularResumo,
    gerarTabelaAnual
  };
})();
