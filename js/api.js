/* ═══════════════════════════════════════════════════════════════
   api.js — Módulo de comunicação com FIPE API v2 e IBGE SIDRA
   ═══════════════════════════════════════════════════════════════ */

const FipeAPI = (() => {
  const BASE = 'https://fipe.parallelum.com.br/api/v2';
  const CACHE_PREFIX = 'fipe_';

  /**
   * Requisição genérica com cache em sessionStorage.
   * @param {string} path  — caminho relativo (ex: "/cars/brands")
   * @returns {Promise<any>}
   */
  async function _fetch(path) {
    const cacheKey = CACHE_PREFIX + path;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); }
      catch { /* cache corrompido, segue para fetch */ }
    }

    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (res.status === 429) {
      throw new Error('RATE_LIMIT');
    }
    if (!res.ok) {
      throw new Error(`FIPE_ERROR_${res.status}`);
    }

    const data = await res.json();

    try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); }
    catch { /* sessionStorage cheio, ignorar */ }

    return data;
  }

  return {
    /**
     * Lista marcas de um tipo de veículo.
     * @param {'cars'|'motorcycles'|'trucks'} tipo
     * @returns {Promise<{code:string, name:string}[]>}
     */
    getMarcas(tipo) {
      return _fetch(`/${tipo}/brands`);
    },

    /**
     * Lista modelos de uma marca.
     * @param {string} tipo
     * @param {string} codMarca
     * @returns {Promise<{code:string, name:string}[]>}
     */
    async getModelos(tipo, codMarca) {
      const data = await _fetch(`/${tipo}/brands/${codMarca}/models`);
      // A API v2 retorna array direto, mas v1 retorna {modelos: [...]}
      return Array.isArray(data) ? data : (data.modelos || data);
    },

    /**
     * Lista anos disponíveis para um modelo.
     * Normaliza o ano "32000" (convenção FIPE para zero-quilômetro do modelo atual)
     * em um nome legível "Zero KM".
     * @param {string} tipo
     * @param {string} codMarca
     * @param {string} codModelo
     * @returns {Promise<{code:string, name:string}[]>}
     */
    async getAnos(tipo, codMarca, codModelo) {
      const data = await _fetch(`/${tipo}/brands/${codMarca}/models/${codModelo}/years`);
      if (!Array.isArray(data)) return data;
      return data.map(item => {
        if (!item || typeof item.name !== 'string') return item;
        const isZeroKm = /^32000\b/.test(item.name) || (item.code && String(item.code).startsWith('32000'));
        if (!isZeroKm) return item;
        const fuel = item.name.replace(/^32000\s*/, '').trim();
        return {
          ...item,
          name: fuel ? `Zero KM ${fuel}` : 'Zero KM'
        };
      });
    },

    /**
     * Obtém dados completos de um veículo (inclui preço FIPE).
     * @param {string} tipo
     * @param {string} codMarca
     * @param {string} codModelo
     * @param {string} codAno
     * @returns {Promise<{brand:string, model:string, modelYear:number, fuel:string, codeFipe:string, price:string, referenceMonth:string}>}
     */
    getVeiculo(tipo, codMarca, codModelo, codAno) {
      return _fetch(`/${tipo}/brands/${codMarca}/models/${codModelo}/years/${codAno}`);
    }
  };
})();


/* ─────────────────────────────────────────────── */
/*  IPCA via IBGE SIDRA API                        */
/* ─────────────────────────────────────────────── */

const IpcaAPI = (() => {
  const CACHE_KEY = 'ipca_media';
  const FALLBACK_RATE = 0.045; // 4,5% a.a.

  /**
   * Busca a taxa IPCA média acumulada em 12 meses (últimos 60 meses).
   * Retorna a taxa anual como decimal (ex: 0.048 = 4,8%).
   * @returns {Promise<{taxa: number, fonte: 'api'|'fallback'}>}
   */
  async function getMediaAnual() {
    // Verificar cache
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.taxa === 'number') return parsed;
      } catch { /* segue */ }
    }

    try {
      // Tabela 7060: IPCA variação acumulada em 12 meses (variável 2263)
      // Buscar últimos 12 meses usando período "last 12"
      const url = 'https://apisidra.ibge.gov.br/values/t/7060/n1/all/v/2263/p/last%2012/f/n';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('SIDRA_ERROR_' + res.status);

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('SIDRA_PARSE_ERROR');
      }

      // Primeira posição é cabeçalho, ignorar
      const valores = (Array.isArray(data) ? data : [])
        .slice(1)
        .map(row => parseFloat(row.V))
        .filter(v => !isNaN(v));

      if (valores.length === 0) throw new Error('NO_DATA');

      // Média dos acumulados 12 meses → dividir por 100 para decimal
      const media = valores.reduce((a, b) => a + b, 0) / valores.length;
      const taxa = media / 100;

      const result = { taxa, fonte: 'api' };

      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(result)); }
      catch { /* cheio */ }

      return result;
    } catch (err) {
      console.warn('[IpcaAPI] Falha ao buscar IPCA, usando fallback:', err.message);
      return { taxa: FALLBACK_RATE, fonte: 'fallback' };
    }
  }

  return { getMediaAnual };
})();
