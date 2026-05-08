# Planejamento da Calculadora de Desvalorização Automotiva

## Requisitos e Variáveis  
- **Entradas do usuário:** O formulário incluirá campos para *Tempo de uso* (anos ou meses), *Preço de compra*, *Estado* e *Cidade* (opcionais, para ajuste inflacionário), e demais variáveis opcionais como *quilometragem anual*, *tipo de combustível* ou *manutenção*. Todas devem ser opcionais, exceto tempo e preço de compra.  
- **Saídas desejadas:** Exibir o **preço final estimado** do carro após o período definido e um **gráfico** da evolução do valor ao longo do tempo. Também mostrar numericamente a diferença entre o preço inicial e final, e quanto desse valor foi “consumido” pela inflação. (Não é necessário destacar outros percentuais além dessa diferença e do impacto inflacionário.)  
- **Fontes de dados:** Vamos usar **dados FIPE reais** para o cálculo depreciação (via API ou tabela baixada). Para inflação, adotaremos o **IPCA** oficial do IBGE, ajustando o valor por eventuais índices locais compostos de estado/cidade se forem considerados relevantes.  

## Fatores de Depreciação e Inflação  
- **Inflação (IPCA):** Aplicar o IPCA como índice padrão de inflação. Se o usuário especificar estado/cidade, poderíamos compor índices locais no cálculo (por exemplo, adicionar diferencial regional sobre o IPCA). A ideia é atualizar o valor de compra ao final do período usando `valor_inicial * (1 + taxa_inflacao)ᵗ`. Esse total será comparado ao valor depreciado.  
- **Depreciação (FIPE):** Usaremos a API FIPE (ou tabela fornecida) para obter a desvalorização real por marca/modelo/ano. Por exemplo, a cada ano subtraímos uma taxa histórica (a FIPE mostra ~15–25% no 1º ano, depois 5–10% ao ano). O cálculo básico será:  
  `valor_final = valor_inicial * (1 - taxa_depreciacao)ᵗ`, onde `taxa_depreciacao` é obtida dos dados FIPE. O código deverá buscar esses valores (via requisição HTTP) usando marca/modelo/ano como parâmetros.  
- **Parâmetros extras:** Além de tempo e preço, incluiremos campos opcionais: 
  - *Quilometragem total/ano* (pode reduzir o valor final se alta, adicionando, por ex., 1–2% de depreciação extra por 10.000 km).  
  - *Combustível* (carros elétricos/diesel costumam desvalorizar diferente; podemos ajustar a taxa em 1–2% adicional opcional).  
  - *Uso e manutenção* (desgaste geral; poderia ser um slider “bom, médio, ruim” que afete discretamente a taxa de depreciação).  
  Todos esses serão inputs opcionais que modulam a taxa de depreciação base.  

## Arquitetura Front-End e Componentes  
- **HTML:** Criaremos uma página única (`index.html`) com um `<form>` contendo inputs numerados e caixas de seleção para todas as variáveis. Cada campo terá um `id` claro (ex.: `#tempo`, `#preco`, `#estado`, `#km`). Incluir um `<canvas id="grafico">` para o gráfico de linhas e um contêiner (por ex. `<div id="resultado">`) para exibir o preço final e as diferenças. Botões em destaque: “Calcular” e, opcionalmente, “Limpar”.  
- **CSS:** No `style.css`, definiremos as cores primárias (tons de vermelho e laranja). Por exemplo, variável `--laranja: #f25c05; --vermelho: #c0392b;`. Aplicar estilos consistentes a todos os elementos: botões em laranja com texto branco, campos de input com borda arredondada e foco laranja suave, cabeçalhos e destaques em vermelho sólido. Usar flexbox ou grid para organizar responsivamente o layout (por exemplo, formulário à esquerda e gráfico à direita em desktop). Incluir `@keyframes` sutis para efeitos de fade-in no resultado, e `transition` nos botões (`:hover { filter: brightness(1.1); }`).  
- **JavaScript:** Um arquivo `script.js` cuidará da lógica: ao clicar em “Calcular”, lerá os campos do formulário, calculará inflação e depreciação, e atualizará a página. Utilizará a **API FIPE** (usando `fetch` ou similar) para obter a taxa real de depreciação conforme marca/modelo/ano (se não houver marca/modelo definido, poderíamos usar uma média genérica). O script calcula:  
   1. Ajuste do preço pela inflação (`valor_inicial * (1 + ipca)ᵗ`).  
   2. Depreciação do carro pelo método FIPE e adicionais (resultando em `valor_depreciado`).  
   3. Diferença = `valor_ajustado - valor_depreciado`.  
   Em seguida, exibe o resultado no DOM (por exemplo: “Preço final estimado: R$ X, diferença: R$ Y” dentro de `<div id="resultado">`).  

- **Gráfico (Chart.js):** Utilizaremos Chart.js para plotar uma **gráfico de linha** do valor do veículo ao longo do tempo. Preparamos dois conjuntos de dados:
   - **Linha de Depreciação:** valores anuais (ou mensais) calculados: `valor_i = valor_i-1 * (1 - taxa_depreciacao)`.  
   - **Linha Ajustada pela Inflação:** valores caso o carro tivesse acompanhado a inflação: `valor_inflacionado_i = valor_inicial * (1 + ipca)ᶦ`.  
  Configurar dois *datasets* no Chart.js com cores diferentes (ex.: laranja para depreciação, cinza claro para inflação). O eixo X será “Tempo (anos)”, o eixo Y “Valor do Carro (R$)”. Habilitar animação suave (ex.: `options.animation.duration = 1000`).  

## Design Visual (Cores e Animações)  
- **Paleta e Tipografia:** Fundo da página neutro (branco ou cinza claríssimo). Usar *fontes clássicas e clean* (por exemplo, `"Arial", sans-serif` ou `"Roboto", sem-serif`). Títulos e resultados em vermelho escuro para contraste. Itens interativos (botões, sliders) em laranja vibrante para chamar atenção.  
- **Animações Subtis:** Usar transições leves (`transition: opacity 0.5s`) para exibir gradualmente o resultado e o gráfico após o cálculo. No gráfico, optar por animações padrão do Chart.js (a linha traçada progressivamente em ~1 segundo). Para botões, um leve aumento (`transform: scale(1.05)`) no hover. Evitar animações chamativas ou rápidas demais; queremos uma experiência suave.  
- **Legibilidade:** Garantir que textos tenham boa visibilidade (cor de texto escura sobre fundo claro) e que os números finais sejam destacados (ex.: usar `<strong>` ou `<span>` maior com cor vermelha no preço final). Sem emojis ou gráficos irrelevantes.  

## Passo a Passo de Implementação (Prompts)  
1. **Prompt para Estrutura HTML:**  
   “Crie um arquivo `index.html` básico. Inclua `<input>` e `<label>` para Tempo (anos), Preço de compra (R$), Estado, Cidade, Quilometragem anual, Tipo de combustível, etc. Todos opcionais exceto tempo e preço. Coloque um `<button id='calcular'>Calcular</button>`. Reserve um `<canvas id='grafico'></canvas>` para o gráfico e uma `<div id='resultado'></div>` para exibir o preço final e as diferenças.”  
2. **Prompt para Estilização CSS:**  
   “Crie `style.css` aplicando as cores definidas (#f25c05 para laranja, #c0392b para vermelho). Estilize o `<body>` centralizando o conteúdo. Formulário com label em vermelho e inputs de borda laranja. Botões laranja com texto branco. Defina transições suaves para `:hover`. Garanta que o `<canvas>` ocupe largura adequada e que o layout seja responsivo (ex. usando `display: flex`).”  
3. **Prompt para Lógica JavaScript Básica:**  
   “No `script.js`, escreva código que capture o evento de clique em “Calcular”. Essa função deve ler os valores dos inputs (convertendo para número), calcular o valor ajustado pela inflação usando IPCA (ex.: `valor_inflacionado = preco * Math.pow(1+ipca, tempo)`) e calcular a depreciação com base na FIPE (podemos usar uma taxa fixa inicial para testar). Exiba no `#resultado` o preço final e a diferença em reais.”  
4. **Prompt para Integração com FIPE API:**  
   “Expanda o JS para buscar dados reais da FIPE. Use `fetch` para consultar a API FIPE com marca/modelo/ano (ou load de arquivo CSV, conforme recurso disponível). Extraia a taxa de depreciação média do período e recalcule `valor_final = preco * (1 - taxa)ᵗ`. Atualize o resultado exibido.”  
5. **Prompt para Gráfico com Chart.js:**  
   “Adicione um gráfico de linha em Chart.js. Gere um array de pontos ano a ano com os valores depreciados e outro com valores inflacionados (usando `for` de 0 até `tempo`). Configure o Chart para plotar essas duas séries (cor laranja para depreciação, cinza claro para inflação). Habilite animação (duração ~1000ms) e legenda indicando cada linha.”  
6. **Prompt para Refinamento e Feedback:**  
   “Implemente validação simples: se campos obrigatórios vazios, exiba alerta. Formate os valores exibidos em moeda (R$). Ao recalcular, limpe o gráfico anterior e redesenhe as linhas. Garanta que todos os cálculos sejam atualizados dinamicamente sem recarregar a página (usar DOM e Chart.js conforme necessário).”  

Em cada etapa, use comandos claros para o Antigravity/ChatGPT gerar apenas o código solicitado (HTML, depois CSS, depois JS). Verifique passo a passo no próprio ambiente. Assim teremos a calculadora final com interface em vermelho/laranja, animações sutis e tudo funcionando conforme os requisitos dados.  

## Considerações Finais  
Este planejamento cobre os requisitos de design (cores sólidas e animações leves), as variáveis especificadas (IPCA, FIPE, extras opcionais) e descreve passo a passo como gerar o HTML, CSS e JS necessários. Com ele, você pode instruir o Antigravity a produzir cada parte do site da calculadora e montar tudo de forma integrada.