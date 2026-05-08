/* ═══════════════════════════════════════════════════════════════
   app.js — Orquestrador principal
   Conecta DOM ↔ API ↔ Calculator ↔ Chart
   ═══════════════════════════════════════════════════════════════ */

;(function () {
  'use strict';

  /* ─── Utilidades ─── */

  /** Formata número para BRL (sem centavos) */
  function formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /** Formata número para BRL (com 2 casas) */
  function formatBRL2(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /** Parse de preço FIPE string "R$ 10.000,00" → number */
  function parseFipePrice(str) {
    if (!str) return 0;
    return parseFloat(
      str.replace(/[R$\s.]/g, '').replace(',', '.')
    );
  }

  /** Mostra toast de erro por 6 segundos */
  function showToast(msg) {
    const toast = document.getElementById('toast-erro');
    const toastMsg = document.getElementById('toast-msg');
    toastMsg.textContent = msg;
    toast.hidden = false;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.hidden = true; }, 6000);
  }

  /** Mostra skeleton e esconde select */
  function showSkeleton(id) {
    const skeleton = document.getElementById(`skeleton-${id}`);
    if (skeleton) skeleton.hidden = false;
  }

  function hideSkeleton(id) {
    const skeleton = document.getElementById(`skeleton-${id}`);
    if (skeleton) skeleton.hidden = true;
  }

  /** Popula um <select> com opções */
  function populateSelect(selectEl, items, placeholder) {
    selectEl.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder;
    selectEl.appendChild(opt);

    items.forEach(item => {
      const o = document.createElement('option');
      o.value = item.code;
      o.textContent = item.name;
      selectEl.appendChild(o);
    });

    selectEl.disabled = false;
  }

  /** Reseta um <select> ao estado desabilitado */
  function resetSelect(selectEl, placeholderText) {
    selectEl.innerHTML = `<option value="">${placeholderText}</option>`;
    selectEl.disabled = true;
  }

  /** Animação de contagem numérica */
  function animateValue(element, start, end, duration = 800) {
    const startTime = performance.now();
    const diff = end - start;

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = start + diff * eased;
      element.textContent = formatBRL(Math.round(current));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }


  /* ─── Estado ─── */

  const state = {
    tipo: '',
    marca: '',
    modelo: '',
    ano: '',
    veiculoFipe: null,  // dados retornados pela API
    ipca: null          // {taxa, fonte}
  };


  /* ─── DOM Refs ─── */

  const $tipo       = document.getElementById('tipo');
  const $marca      = document.getElementById('marca');
  const $modelo     = document.getElementById('modelo');
  const $ano        = document.getElementById('ano');
  const $preco      = document.getElementById('preco');
  const $tempo      = document.getElementById('tempo');
  const $tempoValor = document.getElementById('tempo-valor');
  const $km         = document.getElementById('km');
  const $conserv    = document.getElementById('conservacao');
  const $btnCalc    = document.getElementById('btn-calcular');
  const $form       = document.getElementById('form-veiculo');

  const $precoFipeGrupo = document.getElementById('grupo-preco-fipe');
  const $precoFipeValor = document.getElementById('preco-fipe-valor');

  const $emptyState = document.getElementById('empty-state');
  const $resultados = document.getElementById('resultados');
  const $graficoBox = document.getElementById('grafico-container');
  const $tabelaBox  = document.getElementById('tabela-container');


  /* ─── Verificação de campos obrigatórios ─── */

  function checkFormValidity() {
    const tipoOk   = !!$tipo.value;
    const marcaOk  = !!$marca.value;
    const modeloOk = !!$modelo.value;
    const anoOk    = !!$ano.value;
    const precoVal = parseFloat($preco.value);
    const precoOk  = !isNaN(precoVal) && precoVal >= 0;

    $btnCalc.disabled = !(tipoOk && marcaOk && modeloOk && anoOk && precoOk);
  }


  /* ─── Selects Encadeados (FIPE API) ─── */

  // Tipo → carrega marcas
  $tipo.addEventListener('change', async () => {
    state.tipo = $tipo.value;
    state.marca = '';
    state.modelo = '';
    state.ano = '';
    state.veiculoFipe = null;

    resetSelect($marca, 'Carregando marcas...');
    resetSelect($modelo, 'Selecione a marca primeiro');
    resetSelect($ano, 'Selecione o modelo primeiro');
    $precoFipeGrupo.hidden = true;
    checkFormValidity();

    if (!state.tipo) {
      resetSelect($marca, 'Selecione o tipo primeiro');
      return;
    }

    try {
      showSkeleton('marca');
      const marcas = await FipeAPI.getMarcas(state.tipo);
      populateSelect($marca, marcas, 'Selecione a marca');
    } catch (err) {
      handleApiError(err);
      resetSelect($marca, 'Erro ao carregar marcas');
    } finally {
      hideSkeleton('marca');
    }
  });

  // Marca → carrega modelos
  $marca.addEventListener('change', async () => {
    state.marca = $marca.value;
    state.modelo = '';
    state.ano = '';
    state.veiculoFipe = null;

    resetSelect($modelo, 'Carregando modelos...');
    resetSelect($ano, 'Selecione o modelo primeiro');
    $precoFipeGrupo.hidden = true;
    checkFormValidity();

    if (!state.marca) {
      resetSelect($modelo, 'Selecione a marca primeiro');
      return;
    }

    try {
      showSkeleton('modelo');
      const modelos = await FipeAPI.getModelos(state.tipo, state.marca);
      populateSelect($modelo, modelos, 'Selecione o modelo');
    } catch (err) {
      handleApiError(err);
      resetSelect($modelo, 'Erro ao carregar modelos');
    } finally {
      hideSkeleton('modelo');
    }
  });

  // Modelo → carrega anos
  $modelo.addEventListener('change', async () => {
    state.modelo = $modelo.value;
    state.ano = '';
    state.veiculoFipe = null;

    resetSelect($ano, 'Carregando anos...');
    $precoFipeGrupo.hidden = true;
    checkFormValidity();

    if (!state.modelo) {
      resetSelect($ano, 'Selecione o modelo primeiro');
      return;
    }

    try {
      showSkeleton('ano');
      const anos = await FipeAPI.getAnos(state.tipo, state.marca, state.modelo);
      populateSelect($ano, anos, 'Selecione o ano');
    } catch (err) {
      handleApiError(err);
      resetSelect($ano, 'Erro ao carregar anos');
    } finally {
      hideSkeleton('ano');
    }
  });

  // Ano → busca dados do veículo (preço FIPE)
  $ano.addEventListener('change', async () => {
    state.ano = $ano.value;
    state.veiculoFipe = null;
    $precoFipeGrupo.hidden = true;
    checkFormValidity();

    if (!state.ano) return;

    try {
      const veiculo = await FipeAPI.getVeiculo(state.tipo, state.marca, state.modelo, state.ano);
      state.veiculoFipe = veiculo;

      // Mostrar preço FIPE
      $precoFipeValor.textContent = veiculo.price || '—';
      $precoFipeGrupo.hidden = false;

      // Auto-preencher preço de compra se vazio
      if (!$preco.value) {
        const fipeNum = parseFipePrice(veiculo.price);
        if (fipeNum > 0) $preco.value = fipeNum;
      }

      checkFormValidity();
    } catch (err) {
      handleApiError(err);
    }
  });


  /* ─── Range slider ─── */

  $tempo.addEventListener('input', () => {
    $tempoValor.textContent = $tempo.value;
  });

  /* ─── Validação em tempo real ─── */
  $preco.addEventListener('input', checkFormValidity);


  /* ─── Cálculo Principal ─── */

  $form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const precoCompra = parseFloat($preco.value);
    const anos = parseInt($tempo.value, 10);

    // Validação
    if (isNaN(precoCompra) || precoCompra < 0) {
      $preco.classList.add('invalid');
      showToast('Informe um preço de compra válido (pode ser 0).');
      return;
    }
    $preco.classList.remove('invalid');

    if (!anos || anos < 1) {
      showToast('Selecione o tempo de projeção.');
      return;
    }

    // Obter o preço FIPE como base para os cálculos
    if (!state.veiculoFipe || !state.veiculoFipe.price) {
      showToast('Selecione um veículo válido com preço FIPE disponível.');
      return;
    }
    const precoFipe = parseFipePrice(state.veiculoFipe.price);
    if (!precoFipe || precoFipe <= 0) {
      showToast('Preço FIPE indisponível para este veículo.');
      return;
    }

    // Desabilitar botão durante cálculo
    $btnCalc.disabled = true;
    $btnCalc.textContent = 'Calculando...';

    try {
      // 1. Buscar IPCA (com cache)
      if (!state.ipca) {
        state.ipca = await IpcaAPI.getMediaAnual();
      }

      const taxaIpca = state.ipca.taxa;

      // 2. Parâmetros opcionais
      const ajustes = {
        kmAnual: parseInt($km.value, 10) || 12000,
        conservacao: $conserv.value || 'bom'
      };

      // 3. Calcular (baseado no preço FIPE)
      const serieDepreciacao = Calculator.calcularDepreciacao(precoFipe, anos, ajustes);
      const serieInflacao    = Calculator.calcularInflacao(precoFipe, anos, taxaIpca);
      const resumo           = Calculator.calcularResumo(serieDepreciacao, serieInflacao, precoFipe, precoCompra);
      const tabelaDados      = Calculator.gerarTabelaAnual(serieDepreciacao, serieInflacao, precoFipe);

      // 4. Renderizar resultados
      renderResultados(resumo, taxaIpca);
      renderGrafico(serieDepreciacao, serieInflacao);
      renderTabela(tabelaDados);

      // 5. Mostrar seções
      $emptyState.hidden = true;
      $resultados.hidden = false;
      $graficoBox.hidden = false;
      $tabelaBox.hidden  = false;

      // 6. Scroll suave até os resultados
      setTimeout(() => {
        $resultados.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

    } catch (err) {
      console.error('[App] Erro no cálculo:', err);
      showToast('Ocorreu um erro ao calcular. Tente novamente.');
    } finally {
      $btnCalc.disabled = false;
      $btnCalc.innerHTML = `
        <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3-5a9 9 0 0 0 6-8a3 3 0 0 0-3-3a9 9 0 0 0-8 6a6 6 0 0 0-5 3"/><path d="M7 14a6 6 0 0 0-3 6a6 6 0 0 0 6-3"/></svg>
        Calcular Desvalorização
      `;
      checkFormValidity();
    }
  });


  /* ─── Renderizadores ─── */

  function renderResultados(resumo, taxaIpca) {
    // Período
    document.getElementById('res-periodo').textContent = `${resumo.anos} ano${resumo.anos > 1 ? 's' : ''}`;

    // Card Depreciação (baseado na FIPE)
    animateValue(document.getElementById('res-valor-final'), 0, resumo.valorFinal);
    document.getElementById('res-preco-compra').textContent = formatBRL(resumo.precoCompra);

    // Mostrar preço FIPE de referência
    const $resFipe = document.getElementById('res-preco-fipe');
    if ($resFipe) $resFipe.textContent = formatBRL(resumo.precoFipe);

    document.getElementById('res-perda-total').textContent = `-${formatBRL(resumo.perdaFipeNominal)}`;
    document.getElementById('res-perda-percent').textContent = `-${resumo.perdaFipePercentual.toFixed(1)}%`;

    // Indicador de comparação compra vs FIPE
    const $comparacao = document.getElementById('res-comparacao');
    if ($comparacao) {
      const diff = resumo.diferencaCompra;
      if (diff > 0) {
        $comparacao.textContent = `Economia: ${formatBRL(diff)}`;
        $comparacao.className = 'result-card__comparacao result-card__comparacao--positive';
      } else if (diff < 0) {
        $comparacao.textContent = `Acima da FIPE: ${formatBRL(Math.abs(diff))}`;
        $comparacao.className = 'result-card__comparacao result-card__comparacao--negative';
      } else {
        $comparacao.textContent = 'Comprou pelo valor FIPE';
        $comparacao.className = 'result-card__comparacao';
      }
    }

    // Card Inflação
    const ipcaPercent = (taxaIpca * 100).toFixed(1);
    document.getElementById('res-ipca-taxa').textContent = `~${ipcaPercent}% a.a.`;
    animateValue(document.getElementById('res-valor-corrigido'), 0, resumo.valorCorrigido);
    document.getElementById('res-valor-ipca').textContent = formatBRL(resumo.valorCorrigido);
    document.getElementById('res-perda-real').textContent = `-${formatBRL(resumo.perdaReal)}`;

    // Indicar se IPCA é fallback
    if (state.ipca && state.ipca.fonte === 'fallback') {
      document.getElementById('res-ipca-taxa').textContent += ' (est.)';
    }
  }

  function renderGrafico(serieDepreciacao, serieInflacao) {
    DepreciationChart.renderizar('grafico', serieDepreciacao, serieInflacao);
  }

  function renderTabela(dados) {
    const tbody = document.getElementById('tabela-body');
    tbody.innerHTML = '';

    dados.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.ano}º</td>
        <td>${formatBRL2(row.depreciado)}</td>
        <td>${formatBRL2(row.corrigido)}</td>
        <td class="cell-loss">-${formatBRL2(row.perdaNoAno)}</td>
        <td class="cell-loss">-${formatBRL2(row.perdaAcumulada)}</td>
      `;
      tbody.appendChild(tr);
    });
  }


  /* ─── Tratamento de Erros da API ─── */

  function handleApiError(err) {
    if (err.message === 'RATE_LIMIT') {
      showToast('Limite de consultas FIPE atingido. Tente novamente amanhã ou registre um token gratuito em fipe.online.');
    } else if (err.message && err.message.startsWith('FIPE_ERROR')) {
      showToast('Erro ao consultar a API FIPE. Tente novamente em instantes.');
    } else {
      showToast('Erro de conexão. Verifique sua internet e tente novamente.');
    }
    console.error('[App] API Error:', err);
  }


  /* ─── Init ─── */

  // Verificar validade ao carregar
  checkFormValidity();

})();
