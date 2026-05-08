const Calculator = (() => {
  function _getTaxaBase(i) {
    if (i === 1) return 0.15;
    if (i === 2) return 0.10;
    if (i === 3) return 0.08;
    if (i <= 6) return 0.06;
    if (i <= 10) return 0.04;
    return 0.02;
  }

  function _getAjuste(aj = {}) {
    let d = 0;
    const km = aj.kmAnual || 12000;
    if (km > 25000) d += 0.02;
    else if (km > 15000) d += 0.01;
    else if (km < 8000) d -= 0.005;
    const c = aj.conservacao || 'bom';
    if (c === 'excelente') d -= 0.01;
    else if (c === 'regular') d += 0.01;
    else if (c === 'ruim') d += 0.02;
    return d;
  }

  function calcularDepreciacao(preco, anos, aj = {}) {
    const delta = _getAjuste(aj);
    const s = [preco];
    for (let i = 1; i <= anos; i++) {
      const t = Math.max(0, Math.min(1, _getTaxaBase(i) + delta));
      s.push(s[i - 1] * (1 - t));
    }
    return s;
  }

  function calcularInflacao(preco, anos, ipca) {
    const s = [preco];
    for (let i = 1; i <= anos; i++) s.push(preco * Math.pow(1 + ipca, i));
    return s;
  }

  function calcularResumo(sD, sI, preco) {
    const n = sD.length - 1;
    const vF = sD[n], vC = sI[n];
    return { precoCompra: preco, anos: n, valorFinal: vF, valorCorrigido: vC, perdaNominal: preco - vF, perdaPercentual: ((preco - vF) / preco) * 100, perdaReal: vC - vF, serieDepreciacao: sD, serieInflacao: sI };
  }

  function gerarTabelaAnual(sD, sI, preco) {
    const r = [];
    for (let i = 1; i < sD.length; i++) r.push({ ano: i, depreciado: sD[i], corrigido: sI[i], perdaNoAno: sD[i - 1] - sD[i], perdaAcumulada: preco - sD[i] });
    return r;
  }

  return { calcularDepreciacao, calcularInflacao, calcularResumo, gerarTabelaAnual };
})();
