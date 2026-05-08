# CLAUDE.md — Plano Técnico Completo: Calculadora de Desvalorização Automotiva

> **Versão:** 1.0  
> **Data:** 2026-05-07  
> **Stack:** HTML + Vanilla CSS + JavaScript (sem frameworks)  
> **Dependências externas:** Chart.js 4.x (via CDN), Google Fonts (Inter)  
> **APIs consumidas:** FIPE Parallelum API v2, IBGE SIDRA API (IPCA)

---

## 1. Visão Geral do Projeto

Criar um site **single-page** que permita ao usuário calcular a **desvalorização real** de um veículo ao longo do tempo, cruzando dados da **Tabela FIPE** (depreciação de mercado) com o **IPCA oficial do IBGE** (inflação). O resultado será exibido numericamente e em um **gráfico de linhas** interativo.

### 1.1 Princípios de Design
- **Visual premium e moderno** — dark mode com glassmorphism, gradientes suaves e micro-animações.
- **Responsivo** — mobile-first, funcional em qualquer tela ≥ 320px.
- **Sem recarregamento** — toda interação via DOM e `fetch`, sem submissão de formulário.
- **Acessível** — labels semânticos, contraste WCAG AA, estados de foco visíveis.

---

## 2. Requisitos Funcionais

### 2.1 Entradas do Usuário

| Campo | Tipo | Obrigatório | Observações |
|---|---|---|---|
| **Tipo de veículo** | `<select>` | ✅ | `cars`, `motorcycles`, `trucks` |
| **Marca** | `<select>` dinâmico | ✅ | Populado via API FIPE |
| **Modelo** | `<select>` dinâmico | ✅ | Populado ao selecionar marca |
| **Ano/Combustível** | `<select>` dinâmico | ✅ | Populado ao selecionar modelo |
| **Preço de compra (R$)** | `<input type="number">` | ✅ | Valor pago pelo usuário |
| **Tempo de projeção** | `<input type="range">` + número | ✅ | 1 a 20 anos |
| **Quilometragem anual** | `<input type="number">` | ❌ | Default: 12.000 km/ano |
| **Estado de conservação** | `<select>` (Excelente/Bom/Regular/Ruim) | ❌ | Modula taxa de depreciação |

### 2.2 Saídas / Resultados

1. **Card de Resumo** — Preço FIPE atual, preço estimado após N anos, perda absoluta (R$), perda percentual (%).
2. **Card de Inflação** — Valor que o mesmo dinheiro representaria corrigido pelo IPCA, "perda real" descontando inflação.
3. **Gráfico de Linhas (Chart.js)** — Duas curvas:
   - 🔴 **Depreciação FIPE** — valor do veículo caindo ano a ano.
   - 🟡 **Poder de compra (IPCA)** — o preço de compra corrigido pela inflação (subindo).
4. **Tabela ano a ano** — Detalhamento numérico de cada período.

---

## 3. Arquitetura de APIs

### 3.1 FIPE — Parallelum API v2

**Base URL:** `https://fipe.parallelum.com.br/api/v2`

| Endpoint | Método | Retorno |
|---|---|---|
| `/{tipo}/brands` | GET | `[{code, name}]` — lista de marcas |
| `/{tipo}/brands/{marca}/models` | GET | `[{code, name}]` — modelos da marca |
| `/{tipo}/brands/{marca}/models/{modelo}/years` | GET | `[{code, name}]` — anos disponíveis |
| `/{tipo}/brands/{marca}/models/{modelo}/years/{ano}` | GET | Objeto com `price`, `model`, `brand`, `fuel`, `codeFipe`, `modelYear`, `referenceMonth` |

Onde `{tipo}` = `cars` | `motorcycles` | `trucks`.

> [!IMPORTANT]
> **Limite:** 500 requisições/dia sem token. Com token gratuito (registrar em fipe.online): 1.000/dia.
> Header opcional: `X-Subscription-Token: SEU_TOKEN`

**Estratégia de cache:** Armazenar respostas de marcas/modelos em `sessionStorage` para evitar re-fetches durante a sessão do usuário e respeitar o rate limit.

### 3.2 IPCA — IBGE SIDRA API

**Base URL:** `https://apisidra.ibge.gov.br`

| Endpoint | Descrição |
|---|---|
| `/values/t/7060/n1/all/v/2266/p/all/f/n` | IPCA — variação acumulada no ano (%) |
| `/values/t/7060/n1/all/v/2265/p/all/f/n` | IPCA — variação mensal (%) |
| `/values/t/7060/n1/all/v/2263/p/all/f/n` | IPCA — variação acumulada em 12 meses (%) |

**Abordagem escolhida:** Buscar a variação acumulada em 12 meses (`v/2263`) dos últimos 5 anos e calcular a **média** como taxa de projeção futura. Fallback: usar taxa fixa de 4,5% a.a. caso a API falhe.

> [!NOTE]
> A API SIDRA retorna a primeira linha como cabeçalho (metadados). O parsing deve ignorar `response[0]` e processar a partir de `response[1]`.

---

## 4. Lógica de Cálculo

### 4.1 Depreciação

```
valor_ano[0] = preco_compra
valor_ano[i] = valor_ano[i-1] × (1 - taxa_depreciacao_ajustada)
```

**Taxas base (derivadas de dados FIPE históricos):**

| Ano | Taxa base |
|---|---|
| 1º ano | 15% |
| 2º ano | 10% |
| 3º ano | 8% |
| 4º–6º ano | 6% |
| 7º–10º ano | 4% |
| 11º+ ano | 2% |

**Ajustes opcionais:**
- **Quilometragem:** Se > 15.000 km/ano → +1% à taxa; se > 25.000 → +2%.
- **Conservação:** Excelente → -1%; Regular → +1%; Ruim → +2%.

### 4.2 Inflação (IPCA)

```
valor_inflacionado[0] = preco_compra
valor_inflacionado[i] = preco_compra × (1 + ipca_medio)^i
```

### 4.3 Perda Real

```
perda_nominal   = preco_compra - valor_ano[N]
perda_real       = valor_inflacionado[N] - valor_ano[N]
percentual_perda = (perda_nominal / preco_compra) × 100
```

---

## 5. Estrutura de Arquivos

```
fipe-2.5.0/
├── CLAUDE.md                    ← (este documento)
├── index.html                   ← Estrutura semântica da página
├── css/
│   └── style.css                ← Design system completo (variáveis, componentes, responsivo)
├── js/
│   ├── app.js                   ← Orquestrador principal (init, event listeners)
│   ├── api.js                   ← Módulo de comunicação com FIPE e IBGE (fetch + cache)
│   ├── calculator.js            ← Funções puras de cálculo (depreciação, inflação)
│   └── chart.js                 ← Configuração e renderização do Chart.js
└── assets/
    └── favicon.svg              ← Ícone do site
```

---

## 6. Design Visual — Sistema de Design

### 6.1 Paleta de Cores

```css
:root {
  /* Primárias */
  --color-primary:        #F25C05;       /* Laranja vibrante */
  --color-primary-light:  #FF7A2E;
  --color-primary-dark:   #C94A00;

  /* Acentuação */
  --color-accent:         #C0392B;       /* Vermelho sólido */
  --color-accent-light:   #E74C3C;

  /* Superfícies (dark mode) */
  --color-bg:             #0F0F14;       /* Fundo principal */
  --color-surface:        #1A1A24;       /* Cards */
  --color-surface-hover:  #22222E;
  --color-glass:          rgba(255, 255, 255, 0.04);

  /* Texto */
  --color-text:           #F0F0F5;
  --color-text-muted:     #8888A0;
  --color-text-accent:    #F25C05;

  /* Bordas e separadores */
  --color-border:         rgba(255, 255, 255, 0.08);

  /* Gráfico */
  --chart-depreciation:   #F25C05;
  --chart-inflation:      #636380;
}
```

### 6.2 Tipografia

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Escala */
--fs-hero:  clamp(2rem, 5vw, 3.5rem);
--fs-h2:    clamp(1.25rem, 3vw, 1.75rem);
--fs-body:  1rem;
--fs-small: 0.875rem;
--fs-label: 0.75rem;
```

### 6.3 Componentes Visuais

- **Cards:** `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: 16px`, `backdrop-filter: blur(12px)`.
- **Inputs:** Fundo translúcido, borda sutil, `:focus` com `box-shadow` em laranja.
- **Botão primário:** Gradiente laranja → laranja escuro, `border-radius: 12px`, `transition: transform 0.2s, box-shadow 0.2s`, hover com `scale(1.03)` e sombra elevada.
- **Selects:** Estilizados com `appearance: none` e seta customizada via SVG.

### 6.4 Animações

| Elemento | Efeito | Duração |
|---|---|---|
| Cards de resultado | `fadeInUp` (opacity + translateY) | 600ms, ease-out |
| Gráfico | Animação nativa do Chart.js | 1000ms |
| Botão "Calcular" | `scale(1.03)` no hover | 200ms |
| Selects em cascata | `fadeIn` ao carregar opções | 300ms |
| Números de resultado | Contagem animada (count-up) | 800ms |
| Loading states | Skeleton shimmer | Loop contínuo |

---

## 7. Fluxo de Interação do Usuário

```
1. Usuário acessa a página
   └─→ Hero com título animado + descrição

2. Seleciona "Tipo de veículo" (ex: Carros)
   └─→ fetch /cars/brands → popula select "Marca"

3. Seleciona "Marca" (ex: VW)
   └─→ fetch /cars/brands/59/models → popula select "Modelo"

4. Seleciona "Modelo" (ex: Gol)
   └─→ fetch /cars/brands/59/models/25/years → popula select "Ano"

5. Seleciona "Ano" (ex: 2020-1)
   └─→ fetch /cars/brands/59/models/25/years/2020-1
   └─→ Exibe preço FIPE atual no card lateral

6. Preenche "Preço de compra" e "Tempo de projeção"
   └─→ (opcionais: km, conservação)

7. Clica em "Calcular Desvalorização"
   └─→ fetch IPCA (SIDRA) em paralelo
   └─→ Calcula depreciação + inflação
   └─→ Renderiza:
       ├── Cards de resultado (com count-up)
       ├── Gráfico Chart.js (animado)
       └── Tabela ano-a-ano (fadeIn)
```

---

## 8. Etapas de Implementação (ordem de execução)

### Etapa 1 — Estrutura HTML (`index.html`)
Criar o esqueleto semântico da página:
- `<header>` com título/hero e subtítulo
- `<main>` dividido em:
  - `<section id="formulario">` — o formulário com selects encadeados e inputs
  - `<section id="resultados">` — cards de resumo (ocultos até calcular)
  - `<section id="grafico-container">` — o `<canvas>` do Chart.js
  - `<section id="tabela-container">` — tabela detalhada ano-a-ano
- `<footer>` — créditos e links (FIPE, IBGE)
- CDNs: Chart.js 4.x, Google Fonts (Inter)

### Etapa 2 — Design System CSS (`css/style.css`)
Definir todas as variáveis CSS, reset, tipografia, layout grid/flex, componentes (cards, inputs, botões, selects, tabela, skeletons), animações (`@keyframes`), media queries responsivas.

### Etapa 3 — Módulo de API (`js/api.js`)
- Classe/módulo `FipeAPI` com métodos:
  - `getMarcas(tipo)` → `GET /{tipo}/brands`
  - `getModelos(tipo, marca)` → `GET /{tipo}/brands/{marca}/models`
  - `getAnos(tipo, marca, modelo)` → `GET /{tipo}/brands/{marca}/models/{modelo}/years`
  - `getVeiculo(tipo, marca, modelo, ano)` → `GET /{tipo}/brands/{marca}/models/{modelo}/years/{ano}`
- Classe/módulo `IpcaAPI` com:
  - `getIpcaAcumulado()` → `GET /values/t/7060/n1/all/v/2263/p/last%2060/f/n`
  - Parsing: ignorar `response[0]`, extrair valores numéricos, calcular média.
- Cache em `sessionStorage` para todas as respostas.
- Tratamento de erro com fallback (taxa fixa genérica).

### Etapa 4 — Módulo de Cálculo (`js/calculator.js`)
- `calcularDepreciacao(precoCompra, anos, ajustes)` → array de valores ano a ano.
- `calcularInflacao(precoCompra, anos, taxaIpca)` → array de valores ano a ano.
- `calcularResumo(depreciacao, inflacao)` → objeto com perda nominal, perda real, percentuais.
- Todas as funções são **puras** (sem side effects), facilitando testes.

### Etapa 5 — Módulo de Gráfico (`js/chart.js`)
- `renderizarGrafico(canvasId, labels, dadosDepreciacao, dadosInflacao)` — cria/atualiza instância Chart.js.
- Configuração: tipo `line`, animação 1s, cores do design system, tooltip customizado em R$, grid sutil.
- Destruir instância anterior antes de redesenhar (evitar memory leak).

### Etapa 6 — Orquestrador (`js/app.js`)
- `DOMContentLoaded` → carrega marcas iniciais.
- Event listeners nos selects encadeados (marca → modelo → ano).
- Event listener no botão "Calcular":
  1. Validar campos obrigatórios.
  2. Mostrar skeleton loading.
  3. `await` IPCA (se não em cache).
  4. Chamar funções de cálculo.
  5. Renderizar resultados, gráfico e tabela.
  6. Scroll suave até resultados.
- Formatação de moeda com `Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'})`.

### Etapa 7 — Polimento e QA
- Testar todos os fluxos de select encadeado.
- Testar com API offline (fallback gracioso).
- Validar responsividade (320px, 768px, 1024px, 1440px).
- Verificar performance (Lighthouse).
- Adicionar `<meta>` de SEO, Open Graph e favicon.

---

## 9. Tratamento de Erros e Edge Cases

| Cenário | Comportamento |
|---|---|
| API FIPE offline / 500 | Toast de erro + "Tente novamente em instantes" |
| API FIPE rate limit (429) | Mensagem: "Limite de consultas atingido. Tente novamente amanhã." |
| API IPCA offline | Usa taxa IPCA fallback de 4,5% a.a. com aviso discreto |
| Preço de compra = 0 ou negativo | Validação impede cálculo, destaque vermelho no campo |
| Tempo = 0 | Validação impede cálculo |
| Modelo sem dados para o ano | Mensagem: "Dados não disponíveis para esta combinação" |
| Selects não preenchidos | Botão "Calcular" desabilitado até campos obrigatórios preenchidos |

---

## 10. SEO e Metadados

```html
<title>Calculadora de Desvalorização de Veículos | FIPE + IPCA</title>
<meta name="description" content="Calcule quanto seu carro, moto ou caminhão vai desvalorizar usando dados reais da Tabela FIPE e inflação IPCA do IBGE. Gráficos interativos e projeção ano a ano.">
<meta name="keywords" content="calculadora fipe, desvalorização carro, depreciação veículo, tabela fipe, ipca, inflação">
<meta property="og:title" content="Calculadora de Desvalorização Automotiva">
<meta property="og:description" content="Descubra quanto seu veículo vai perder de valor ao longo dos anos com dados FIPE reais.">
<meta property="og:type" content="website">
```

---

## 11. Considerações Finais

Este documento serve como a **fonte de verdade** para a implementação da calculadora. Cada etapa descrita na Seção 8 deve ser executada sequencialmente — cada uma produzindo um arquivo testável independentemente. O design prioriza uma experiência **premium e fluída**, enquanto a arquitetura modular (4 arquivos JS separados) facilita manutenção e debugging.

### Decisões técnicas importantes:
1. **Sem framework JS** — o projeto é suficientemente simples para vanilla JS, evitando overhead.
2. **Dark mode por padrão** — estética moderna e diferenciada.
3. **Cache em sessionStorage** — respeita o rate limit da API FIPE sem persistir dados entre sessões.
4. **Taxas de depreciação fixas** — como a API FIPE não fornece taxa de depreciação futura diretamente, usamos curvas históricas bem documentadas como aproximação.
5. **IPCA como proxy de inflação** — é o índice oficial mais abrangente do Brasil.
