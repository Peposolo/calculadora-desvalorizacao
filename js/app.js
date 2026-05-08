/* app.js — Orquestrador principal */
;(function () {
  'use strict';

  function formatBRL(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
  }
  function formatBRL2(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  }
  function parseFipePrice(s) {
    if (!s) return 0;
    return parseFloat(s.replace(/[R$\s.]/g, '').replace(',', '.'));
  }

  function showToast(msg) {
    var t = document.getElementById('toast-erro');
    var m = document.getElementById('toast-msg');
    m.textContent = msg;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(function() { t.hidden = true; }, 6000);
  }

  function showSkeleton(id) {
    var s = document.getElementById('skeleton-' + id);
    if (s) s.hidden = false;
  }
  function hideSkeleton(id) {
    var s = document.getElementById('skeleton-' + id);
    if (s) s.hidden = true;
  }

  function populateSelect(el, items, ph) {
    el.innerHTML = '';
    var o = document.createElement('option');
    o.value = '';
    o.textContent = ph;
    el.appendChild(o);
    items.forEach(function(item) {
      var op = document.createElement('option');
      op.value = item.code;
      op.textContent = item.name;
      el.appendChild(op);
    });
    el.disabled = false;
  }

  function resetSelect(el, ph) {
    el.innerHTML = '<option value="">' + ph + '</option>';
    el.disabled = true;
  }

  function animateValue(el, start, end, dur) {
    dur = dur || 800;
    var st = performance.now();
    var diff = end - start;
    function step(ct) {
      var p = Math.min((ct - st) / dur, 1);
      var e = 1 - (1 - p) * (1 - p);
      el.textContent = formatBRL(Math.round(start + diff * e));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var state = { tipo: '', marca: '', modelo: '', ano: '', veiculoFipe: null, ipca: null };

  var $tipo = document.getElementById('tipo');
  var $marca = document.getElementById('marca');
  var $modelo = document.getElementById('modelo');
  var $ano = document.getElementById('ano');
  var $preco = document.getElementById('preco');
  var $tempo = document.getElementById('tempo');
  var $tempoValor = document.getElementById('tempo-valor');
  var $km = document.getElementById('km');
  var $conserv = document.getElementById('conservacao');
  var $btnCalc = document.getElementById('btn-calcular');
  var $form = document.getElementById('form-veiculo');
  var $precoFipeGrupo = document.getElementById('grupo-preco-fipe');
  var $precoFipeValor = document.getElementById('preco-fipe-valor');
  var $emptyState = document.getElementById('empty-state');
  var $resultados = document.getElementById('resultados');
  var $graficoBox = document.getElementById('grafico-container');
  var $tabelaBox = document.getElementById('tabela-container');

  function checkFormValidity() {
    $btnCalc.disabled = !($tipo.value && $marca.value && $modelo.value && $ano.value && parseFloat($preco.value) > 0);
  }

  $tipo.addEventListener('change', async function() {
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
    if (!state.tipo) { resetSelect($marca, 'Selecione o tipo primeiro'); return; }
    try {
      showSkeleton('marca');
      var m = await FipeAPI.getMarcas(state.tipo);
      populateSelect($marca, m, 'Selecione a marca');
    } catch (e) {
      handleApiError(e);
      resetSelect($marca, 'Erro ao carregar marcas');
    } finally {
      hideSkeleton('marca');
    }
  });

  $marca.addEventListener('change', async function() {
    state.marca = $marca.value;
    state.modelo = '';
    state.ano = '';
    state.veiculoFipe = null;
    resetSelect($modelo, 'Carregando modelos...');
    resetSelect($ano, 'Selecione o modelo primeiro');
    $precoFipeGrupo.hidden = true;
    checkFormValidity();
    if (!state.marca) { resetSelect($modelo, 'Selecione a marca primeiro'); return; }
    try {
      showSkeleton('modelo');
      var m = await FipeAPI.getModelos(state.tipo, state.marca);
      populateSelect($modelo, m, 'Selecione o modelo');
    } catch (e) {
      handleApiError(e);
      resetSelect($modelo, 'Erro ao carregar modelos');
    } finally {
      hideSkeleton('modelo');
    }
  });

  $modelo.addEventListener('change', async function() {
    state.modelo = $modelo.value;
    state.ano = '';
    state.veiculoFipe = null;
    resetSelect($ano, 'Carregando anos...');
    $precoFipeGrupo.hidden = true;
    checkFormValidity();
    if (!state.modelo) { resetSelect($ano, 'Selecione o modelo primeiro'); return; }
    try {
      showSkeleton('ano');
      var a = await FipeAPI.getAnos(state.tipo, state.marca, state.modelo);
      populateSelect($ano, a, 'Selecione o ano');
    } catch (e) {
      handleApiError(e);
      resetSelect($ano, 'Erro ao carregar anos');
    } finally {
      hideSkeleton('ano');
    }
  });

  $ano.addEventListener('change', async function() {
    state.ano = $ano.value;
    state.veiculoFipe = null;
    $precoFipeGrupo.hidden = true;
    checkFormValidity();
    if (!state.ano) return;
    try {
      var v = await FipeAPI.getVeiculo(state.tipo, state.marca, state.modelo, state.ano);
      state.veiculoFipe = v;
      $precoFipeValor.textContent = v.price || '\u2014';
      $precoFipeGrupo.hidden = false;
      if (!$preco.value) {
        var f = parseFipePrice(v.price);
        if (f > 0) $preco.value = f;
      }
      checkFormValidity();
    } catch (e) {
      handleApiError(e);
    }
  });

  $tempo.addEventListener('input', function() {
    $tempoValor.textContent = $tempo.value;
  });
  $preco.addEventListener('input', checkFormValidity);

  $form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var pc = parseFloat($preco.value);
    var anos = parseInt($tempo.value, 10);
    if (!pc || pc <= 0) {
      $preco.classList.add('invalid');
      showToast('Informe um pre\u00e7o de compra v\u00e1lido.');
      return;
    }
    $preco.classList.remove('invalid');
    if (!anos || anos < 1) {
      showToast('Selecione o tempo de proje\u00e7\u00e3o.');
      return;
    }
    $btnCalc.disabled = true;
    $btnCalc.textContent = 'Calculando...';
    try {
      if (!state.ipca) state.ipca = await IpcaAPI.getMediaAnual();
      var aj = { kmAnual: parseInt($km.value, 10) || 12000, conservacao: $conserv.value || 'bom' };
      var sD = Calculator.calcularDepreciacao(pc, anos, aj);
      var sI = Calculator.calcularInflacao(pc, anos, state.ipca.taxa);
      var res = Calculator.calcularResumo(sD, sI, pc);
      var tab = Calculator.gerarTabelaAnual(sD, sI, pc);
      renderResultados(res, state.ipca.taxa);
      renderGrafico(sD, sI);
      renderTabela(tab);
      $emptyState.hidden = true;
      $resultados.hidden = false;
      $graficoBox.hidden = false;
      $tabelaBox.hidden = false;
      setTimeout(function() {
        $resultados.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      console.error('[App]', err);
      showToast('Ocorreu um erro ao calcular. Tente novamente.');
    } finally {
      $btnCalc.disabled = false;
      $btnCalc.innerHTML = '<svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3-5a9 9 0 0 0 6-8a3 3 0 0 0-3-3a9 9 0 0 0-8 6a6 6 0 0 0-5 3"/><path d="M7 14a6 6 0 0 0-3 6a6 6 0 0 0 6-3"/></svg> Calcular Desvaloriza\u00e7\u00e3o';
      checkFormValidity();
    }
  });

  function renderResultados(r, ipca) {
    document.getElementById('res-periodo').textContent = r.anos + ' ano' + (r.anos > 1 ? 's' : '');
    animateValue(document.getElementById('res-valor-final'), 0, r.valorFinal);
    document.getElementById('res-preco-compra').textContent = formatBRL(r.precoCompra);
    document.getElementById('res-perda-total').textContent = '-' + formatBRL(r.perdaNominal);
    document.getElementById('res-perda-percent').textContent = '-' + r.perdaPercentual.toFixed(1) + '%';
    document.getElementById('res-ipca-taxa').textContent = '~' + (ipca * 100).toFixed(1) + '% a.a.';
    animateValue(document.getElementById('res-valor-corrigido'), 0, r.valorCorrigido);
    document.getElementById('res-valor-ipca').textContent = formatBRL(r.valorCorrigido);
    document.getElementById('res-perda-real').textContent = '-' + formatBRL(r.perdaReal);
    if (state.ipca && state.ipca.fonte === 'fallback') {
      document.getElementById('res-ipca-taxa').textContent += ' (est.)';
    }
  }

  function renderGrafico(sD, sI) {
    DepreciationChart.renderizar('grafico', sD, sI);
  }

  function renderTabela(dados) {
    var tb = document.getElementById('tabela-body');
    tb.innerHTML = '';
    dados.forEach(function(r) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + r.ano + '\u00ba</td><td>' + formatBRL2(r.depreciado) + '</td><td>' + formatBRL2(r.corrigido) + '</td><td class="cell-loss">-' + formatBRL2(r.perdaNoAno) + '</td><td class="cell-loss">-' + formatBRL2(r.perdaAcumulada) + '</td>';
      tb.appendChild(tr);
    });
  }

  function handleApiError(err) {
    if (err.message === 'RATE_LIMIT') {
      showToast('Limite de consultas FIPE atingido. Tente novamente amanh\u00e3.');
    } else if (err.message && err.message.startsWith('FIPE_ERROR')) {
      showToast('Erro ao consultar a API FIPE. Tente novamente.');
    } else {
      showToast('Erro de conex\u00e3o. Verifique sua internet.');
    }
    console.error('[App] API Error:', err);
  }

  checkFormValidity();
})();
