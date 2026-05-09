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
    const precoOk  = !isNaN(precoVal) && precoVal > 0;

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
    if (isNaN(precoCompra) || precoCompra <= 0) {
      $preco.classList.add('invalid');
      showToast('Informe um preço de compra válido maior que zero.');
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

      // 3. Curvas: depreciação parte sempre do preço FIPE (valor real do veículo)
      const serieDepreciacao = Calculator.calcularDepreciacao(precoFipe, anos, ajustes);
      const resumo           = Calculator.calcularResumo(serieDepreciacao, precoFipe, precoCompra, taxaIpca);
      const tabelaDados      = Calculator.gerarTabelaAnual(
        resumo.serieDepreciacaoNominal,
        resumo.seriePagoCorrigido,
        precoFipe
      );

      // 4. Renderizar resultados (curvas em moeda nominal futura)
      renderResultados(resumo, taxaIpca);
      renderGrafico(resumo.serieDepreciacaoNominal, resumo.seriePagoCorrigido, precoCompra);
      renderTabela(tabelaDados, precoCompra);

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
    const periodoLabel = `${resumo.anos} ano${resumo.anos > 1 ? 's' : ''}`;
    document.getElementById('res-periodo').textContent = periodoLabel;
    const $periodoPago = document.getElementById('res-periodo-pago');
    if ($periodoPago) $periodoPago.textContent = periodoLabel;

    const semCompra = !resumo.temCompra;

    // Card 1 — Hero 1: Valor estimado ajustado do veículo (FIPE + IPCA + depreciação)
    animateValue(document.getElementById('res-valor-final'), 0, resumo.valorFinalNominal);

    // Card 1 — Hero 2: Preço pago corrigido pelo IPCA
    const $heroPago = document.getElementById('result-hero-pago');
    if ($heroPago) $heroPago.hidden = false;

    if (!semCompra) {
      const ipcaPercent = (taxaIpca * 100).toFixed(1);
      const $ipcaTaxa = document.getElementById('res-ipca-taxa');
      $ipcaTaxa.textContent = `~${ipcaPercent}% a.a.`;
      if (state.ipca && state.ipca.fonte === 'fallback') {
        $ipcaTaxa.textContent += ' (est.)';
      }
      animateValue(document.getElementById('res-valor-corrigido'), 0, resumo.valorPagoFinal);
    }

    // Card 2 — Variações e diferenças
    const $cardComp = document.getElementById('result-card-comparacao');
    if ($cardComp) $cardComp.hidden = false;

    if (!semCompra) {
      // Grupo "atual": no momento da compra, vs. FIPE atual
      const $varAtual = document.getElementById('res-variacao-atual');
      const $varAtualPct = document.getElementById('res-variacao-atual-percent');
      $varAtual.textContent = signedBRLBig(resumo.variacaoAtual);
      $varAtualPct.textContent = signedPercent(resumo.variacaoAtualPercentual);
      aplicarSignClass($varAtual, resumo.variacaoAtual);
      aplicarSignClass($varAtualPct, resumo.variacaoAtualPercentual);

      // Grupo "após ajuste": após N anos, valor real do veículo vs. pago corrigido
      const $varAjust = document.getElementById('res-variacao-ajustada');
      const $varAjustPct = document.getElementById('res-variacao-ajustada-percent');
      $varAjust.textContent = signedBRLBig(resumo.variacaoAposAjuste);
      $varAjustPct.textContent = signedPercent(resumo.variacaoAposAjustePercentual);
      aplicarSignClass($varAjust, resumo.variacaoAposAjuste);
      aplicarSignClass($varAjustPct, resumo.variacaoAposAjustePercentual);

      renderDiferenca(
        document.getElementById('res-comparacao-inicial'),
        'Diferença inicial',
        resumo.diferencaInicial,
        false,
        'pago abaixo da FIPE',
        'pago acima da FIPE',
        'pago igual à FIPE'
      );
      renderDiferenca(
        document.getElementById('res-comparacao-final'),
        `Diferença final (após ${periodoLabel})`,
        resumo.diferencaFinal,
        false,
        'economia real do veículo',
        'gasto real do veículo',
        'empate com o pago corrigido'
      );
    }
  }

  /**
   * Aplica classes de sinal (cell-positive / cell-loss) a um elemento.
   */
  function aplicarSignClass(el, valor) {
    if (!el) return;
    el.classList.remove('cell-positive', 'cell-loss');
    if (valor > 0) el.classList.add('cell-positive');
    else if (valor < 0) el.classList.add('cell-loss');
  }

  /**
   * Renderiza uma badge de diferença com rótulos contextuais.
   * @param {HTMLElement} el
   * @param {string} prefixo
   * @param {number} valor — positivo = vantagem do usuário, negativo = perda
   * @param {boolean} semCompra — se true, esconde o elemento
   * @param {string} labelPositivo — texto após "—" quando valor > 0
   * @param {string} labelNegativo — texto após "—" quando valor < 0
   * @param {string} labelZero — texto quando valor === 0
   */
  function renderDiferenca(el, prefixo, valor, semCompra, labelPositivo, labelNegativo, labelZero) {
    if (!el) return;
    if (semCompra) {
      el.textContent = '';
      el.className = 'result-card__comparacao';
      el.hidden = true;
      return;
    }
    el.hidden = false;
    if (valor > 0) {
      el.textContent = `${prefixo} — ${labelPositivo}: ${formatBRL(valor)}`;
      el.className = 'result-card__comparacao result-card__comparacao--positive';
    } else if (valor < 0) {
      el.textContent = `${prefixo} — ${labelNegativo}: ${formatBRL(Math.abs(valor))}`;
      el.className = 'result-card__comparacao result-card__comparacao--negative';
    } else {
      el.textContent = `${prefixo}: ${labelZero}`;
      el.className = 'result-card__comparacao';
    }
  }

  function renderGrafico(serieDepreciacaoNominal, seriePagoCorrigido, precoCompra) {
    DepreciationChart.renderizar('grafico', serieDepreciacaoNominal, seriePagoCorrigido, precoCompra);
  }

  function renderTabela(dados, precoCompra) {
    const tbody = document.getElementById('tabela-body');
    const $tabela = document.getElementById('tabela-dados');
    tbody.innerHTML = '';

    const temCompra = !!precoCompra && precoCompra > 0;
    if ($tabela) {
      $tabela.classList.toggle('table--has-pago-corrigido', temCompra);
    }

    dados.forEach(row => {
      const tr = document.createElement('tr');

      const pagoCell = (temCompra && row.pagoCorrigido !== null)
        ? `<td class="col-pago-corrigido">${formatBRL2(row.pagoCorrigido)}</td>`
        : `<td class="col-pago-corrigido">—</td>`;

      // gastoReal positivo = perda real (dinheiro corrigido > valor do veículo)
      // Invertemos o sinal para que perda apareça em vermelho com prefixo −.
      const gastoCell = (temCompra && row.gastoReal !== null)
        ? `<td class="col-gasto-real ${signClass(-row.gastoReal)}">${signedBRL(-row.gastoReal)}</td>`
        : `<td class="col-gasto-real">—</td>`;

      tr.innerHTML = `
        <td>${row.ano}º</td>
        <td>${formatBRL2(row.valorFipe)}</td>
        ${pagoCell}
        <td class="${signClass(row.variacaoNoAno)}">${signedBRL(row.variacaoNoAno)}</td>
        <td class="${signClass(row.variacaoTotal)}">${signedBRL(row.variacaoTotal)}</td>
        ${gastoCell}
      `;
      tbody.appendChild(tr);
    });
  }

  /** Retorna a classe CSS conforme o sinal (positivo = ganho, negativo = perda). */
  function signClass(valor) {
    if (valor > 0) return 'cell-positive';
    if (valor < 0) return 'cell-loss';
    return '';
  }

  /** Formata um número com sinal explícito (+/−) em moeda BRL com 2 casas. */
  function signedBRL(valor) {
    if (valor === 0) return formatBRL2(0);
    const sinal = valor > 0 ? '+' : '−';
    return `${sinal}${formatBRL2(Math.abs(valor))}`;
  }

  /** Versão sem casas decimais para os hero rows dos cards. */
  function signedBRLBig(valor) {
    if (valor === 0) return formatBRL(0);
    const sinal = valor > 0 ? '+' : '−';
    return `${sinal}${formatBRL(Math.abs(valor))}`;
  }

  /** Formata percentual com sinal explícito. */
  function signedPercent(valor) {
    if (valor === 0) return '0,0%';
    const sinal = valor > 0 ? '+' : '−';
    return `${sinal}${Math.abs(valor).toFixed(1).replace('.', ',')}%`;
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
