const FipeAPI = (() => {
  const BASE = 'https://fipe.parallelum.com.br/api/v2';
  const CACHE_PREFIX = 'fipe_';

  async function _fetch(path) {
    const cacheKey = CACHE_PREFIX + path;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); }
      catch { /* cache corrompido */ }
    }
    const res = await fetch(`${BASE}${path}`, { headers: { 'Accept': 'application/json' } });
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (!res.ok) throw new Error(`FIPE_ERROR_${res.status}`);
    const data = await res.json();
    try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
    return data;
  }

  return {
    getMarcas(tipo) { return _fetch(`/${tipo}/brands`); },
    async getModelos(tipo, codMarca) {
      const data = await _fetch(`/${tipo}/brands/${codMarca}/models`);
      return Array.isArray(data) ? data : (data.modelos || data);
    },
    getAnos(tipo, codMarca, codModelo) { return _fetch(`/${tipo}/brands/${codMarca}/models/${codModelo}/years`); },
    getVeiculo(tipo, codMarca, codModelo, codAno) { return _fetch(`/${tipo}/brands/${codMarca}/models/${codModelo}/years/${codAno}`); }
  };
})();

const IpcaAPI = (() => {
  const CACHE_KEY = 'ipca_media';
  const FALLBACK_RATE = 0.045;

  async function getMediaAnual() {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try { const p = JSON.parse(cached); if (p && typeof p.taxa === 'number') return p; } catch {}
    }
    try {
      const url = 'https://apisidra.ibge.gov.br/values/t/7060/n1/all/v/2263/p/last%2012/f/n';
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(tid);
      if (!res.ok) throw new Error('SIDRA_ERROR_' + res.status);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('SIDRA_PARSE_ERROR'); }
      const valores = (Array.isArray(data) ? data : []).slice(1).map(r => parseFloat(r.V)).filter(v => !isNaN(v));
      if (valores.length === 0) throw new Error('NO_DATA');
      const taxa = valores.reduce((a, b) => a + b, 0) / valores.length / 100;
      const result = { taxa, fonte: 'api' };
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(result)); } catch {}
      return result;
    } catch (err) {
      console.warn('[IpcaAPI] Fallback:', err.message);
      return { taxa: FALLBACK_RATE, fonte: 'fallback' };
    }
  }

  return { getMediaAnual };
})();
