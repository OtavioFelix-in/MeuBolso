# Sprint 3 — Insights + Notificações inteligentes (planejamento)

> **Nada implementado ainda.** Documento de detalhamento para revisão antes de codar.
> Objetivo: o diferencial de valor do Meu Bolso — um "assistente financeiro"
> **100% offline e local** (sem IA, sem nuvem), só estatística sobre os dados que
> o usuário já registra.

## Pré-requisitos descobertos em auditoria de código (2026-08-10)

Antes de codar o motor, dois números que os insights vão citar estavam incorretos:

- **Reserva de emergência otimista** (`getFinancialProfile`, `src/db/reports.js`):
  `liquid = available + goals + investments` dividido por `avgExpense` **total** (não
  só essencial), e tratava 100% dos investimentos como líquidos, mesmo travados
  (CDB com carência, previdência).
- **Patrimônio líquido sem passivos** (`getNetWorth`, `src/db/reports.js`):
  somava só `available + goals + investments + assets`. Fatura de cartão em aberto e
  parcelas futuras não entravam como dívida — o número saía maior do que era de verdade.

✅ **Corrigido em 2026-08-13:**
- `categories.essential` (migração `addColumnIfMissing`) — eixo essencial/supérfluo,
  marcado nas categorias padrão (Alimentação, Transporte, Moradia, Educação, Saúde,
  Impostos e taxas) e editável em Ajustes › categoria (toggle "Despesa essencial",
  só nas categorias-mãe de despesa).
- `investments.liquid` (default 1) — toggle "Liquidez imediata" no formulário de
  investimento; CDB com carência/previdência pode ser marcado como não-líquido.
- `getEssentialExpense(month)` — soma só despesas de categorias essenciais.
- `getLiabilities()` — fatura de cartão em aberto + parcelas futuras fora do cartão
  (`paid = 0`), somadas.
- `getNetWorth()` agora devolve `{ available, goals, investments, assets, liabilities,
  gross, total }`, com `total = gross - liabilities`.
- `getFinancialProfile().emergencyMonths` agora usa `avgEssentialExpense` no
  denominador e só investimentos com `liquid = 1` no numerador.
- Tela de Relatórios (Composição do patrimônio) ganhou a linha "Fatura e parcelas em
  aberto" e os textos de reserva de emergência foram atualizados.

Os insights #1–#12 (seção 3) não dependiam dessas correções (usam fluxo de caixa e
médias de gasto, que já estavam certos) — mas agora, se algum insight futuro citar
reserva de emergência ou patrimônio líquido, já parte de números corretos.

## Princípio que guia tudo: degradar com elegância

Insight bom precisa de **histórico**. No 1º mês não existe "você gastou mais que a
média". Então cada insight declara um **histórico mínimo** e, com pouco dado, o app
mostra versões mais simples (ou esconde). Regra de ouro: **nunca inventar comparação
que não existe** — isso destrói a confiança.

Níveis de maturidade dos dados:
- **0–1 mês**: só fatos do mês atual (maior gasto, resultado, ritmo simples).
- **2 meses**: comparativo mês a mês.
- **3+ meses**: médias, tendências por categoria, "fora do padrão".

---

## 1. Onde fica — decisão de navegação (RESOLVIDO em 2026-08-10: absorver Relatórios)

Você escolheu **aba "Insights"**. Alerta de PM: hoje já são **5 abas**
(Início · Despesas · Meses · Carteira · Relatórios). Uma 6ª aparta a barra e
**Insights e Relatórios se sobrepõem** muito (ambos analisam gastos).

**Recomendação:** transformar **Relatórios em "Insights"** — a aba passa a ter os
**cards de insight no topo** e os **gráficos que já existem embaixo**. Mantém 5 abas,
sem poluir, e dá destaque ao diferencial. (Se você preferir mesmo 6 abas separadas,
dá pra fazer — só custa espaço na barra.)

> ⏳ Decisão pendente: **absorver Relatórios** (recomendado) ou **6ª aba separada**?

---

## 2. Motor de estatística — `src/db/insights.js`

Funções puras sobre o banco, sem UI. Reaproveitam o que já existe
(`getMonthlySeries`, `getCategoryBreakdown`, `getMonthSummary`, `getCards`…).

| Função | O que devolve |
|---|---|
| `getSpendTotals(month, n)` | total de gasto dos últimos n meses |
| `getCategoryAverages(month, lookback)` | média por categoria nos últimos meses |
| `getMonthPace(month)` | gasto até agora, dias restantes, **projeção de fechamento** |
| `getBiggestExpense(month)` | maior lançamento do mês (categoria/descrição/valor) |
| `getAnomalies(month)` | lançamentos muito acima do normal da própria categoria |
| `getSubscriptionsWeight(month)` | quanto as contas fixas pesam na renda |
| `buildInsights(month)` | **monta a lista ordenada de insights prontos** |

`buildInsights` devolve objetos padronizados:
`{ id, type: 'positivo'|'alerta'|'neutro', emoji, title, text, priority }`.

---

## 3. Catálogo de insights (regra + texto + limiar)

> Limiares são **valores iniciais**, fáceis de ajustar depois de ver na prática.

| # | Insight | Quando dispara | Hist. mín. | Texto (exemplo) | Tipo |
|---|---|---|---|---|---|
| 1 | **Resultado do mês** | sempre | 0 | "Este mês você está sobrando **R$ 420**." / "…no vermelho em **R$ 130**." | pos/alerta |
| 2 | **Comparativo mensal** | há mês anterior com dados | 1 mês | "Você gastou **12% a mais** que em julho." | neutro |
| 3 | **Categoria em alta** | categoria > média(3m) + **30%** | 2–3 meses | "Seu gasto com **Delivery** subiu **40%** vs. sua média." | alerta |
| 4 | **Categoria em queda** | categoria < média(3m) − **20%** | 2–3 meses | "Mandou bem: **Transporte** ficou **25% abaixo** do normal. 👏" | positivo |
| 5 | **Ritmo do mês** | projeção > média × **1.15** | 1 mês | "No ritmo atual, deve fechar em **R$ 2.100**, acima do normal." | alerta |
| 6 | **Ritmo bom** | projeção < média × **0.9** | 1 mês | "Está gastando **mais devagar** que o normal. 👏" | positivo |
| 7 | **Maior gasto** | há gasto no mês | 0 | "Seu maior gasto foi **Mercado**: R$ 380." | neutro |
| 8 | **Lançamento fora do padrão** | 1 lançamento > média da categoria × **2.5** | 3 meses | "Um gasto de **R$ 600** em Lazer chamou atenção — bem acima do seu normal." | alerta |
| 9 | **Peso das contas fixas** | contas fixas > **50%** da renda | 0 | "Suas contas fixas consomem **58%** da sua renda." | alerta |
| 10 | **Uso do cartão** | uso > **80%** do limite | 0 | "O cartão **Nubank** já usou **85%** do limite." | alerta |
| 11 | **Sem registrar** | **5+ dias** sem lançar | 0 | "Faz 6 dias sem registrar nada. Bora atualizar?" | neutro |
| 12 | **Melhor mês** | melhor sobra do histórico | 3 meses | "Sua melhor economia desde que começou. 🎉" | positivo |

Ordenação na tela: **alertas** primeiro (o que precisa de atenção), depois
**positivos** (reforço), depois **neutros** (contexto). Limitar a ~5 cards por vez
pra não virar parede de texto.

---

## 4. Notificações inteligentes

Sobem sobre o mesmo motor. O problema clássico é **spam → usuário desliga tudo**.
Solução: **orçamento de disparo**.

### Regras do orçamento
- Máximo **3 notificações "inteligentes" por semana** (fora as de conta vencendo,
  que são sempre permitidas por serem acionáveis).
- **Gap mínimo de 48h** entre notificações não críticas.
- **Prioridade**: conta/fatura vencendo > ritmo estourando > gasto atípico >
  resumo semanal > engajamento. Se estourar o orçamento, manda só a de maior
  prioridade.
- Guardar `notif_last_sent` e um histórico leve em `settings` pra respeitar os limites.

### Catálogo de notificações

| Notificação | Quando | Prioridade |
|---|---|---|
| Conta/parcela vence amanhã | já existe (`notif_bills`) | crítica |
| Fatura do cartão fecha/vence | X dias antes do `closing_day`/`due_day` | crítica |
| Ritmo do mês estourando | ~dia 15, se projeção > média × 1.2 | alta |
| Gasto atípico detectado | ao abrir o app após registrar (checagem) | média |
| Resumo semanal | domingo 20h: "Semana: R$ X, Y% vs. média" | média |
| Salário caiu | no dia do salário | baixa |
| Meta batida / quase | quando cruzar o alvo | baixa |
| Faz N dias sem registrar | 5+ dias, no máximo 1x/semana | baixa |

Tudo respeita os toggles que já existem em Ajustes › Notificações (e a gente
adiciona toggles novos: "Resumo semanal", "Alertas de gasto").

### Implementado em 2026-08-10 (`src/notifications/notifications.js`)

- ✅ **Ritmo do mês estourando**, **gasto atípico** e **uso de cartão > 80%** —
  unificados no toggle **"Alertas de gasto"** (`notif_smart`, default desligado).
  Orçamento real: máx. 3/semana, gap de 48h, prioridade nessa ordem, log
  persistido em `settings.notif_smart_log` (não é apagado pelo reagendamento
  geral — só as notificações agendadas são canceladas/recriadas a cada abertura).
- ✅ **Resumo semanal** — toggle **"Resumo semanal"** (`notif_weekly`, default
  ligado), reagendado pro próximo domingo 20h a cada abertura do app, com o
  número calculado na hora (`db.getWeekSummary`), não um trigger recorrente
  "burro" do SO com conteúdo parado.
- ⏭️ **Fatura do cartão fecha/vence** (data específica de vencimento) — não
  implementado; o alerta de uso > 80% cobre o mesmo risco de forma mais simples,
  sem precisar modelar o ciclo de fechamento/vencimento do cartão.
- ⏭️ **Salário caiu** e **meta batida/quase** — não implementados. Metas nem têm
  UI hoje (fora da tela desde a v5, conforme `PLANEJAMENTO.md`), e "salário caiu"
  tem baixo valor por não ter engatilhador de UI ainda. Ficam pro backlog se
  fizerem falta na prática.
- ✅ **Faz N dias sem registrar** — já coberto pelo toggle existente "Lembrete
  diário" (`notif_daily`); não duplicado.

---

## 5. Ordem de implementação (quando aprovar)

1. ✅ **Motor** (`insights.js`) — implementado 2026-08-10 (`src/db/insights.js`).
2. ✅ **Tela de Insights** (cards) — implementado 2026-08-10 (`ReportsScreen.js` + `TabBar.js`).
3. ✅ **Notificações inteligentes** + orçamento de disparo — implementado 2026-08-10 (escopo reduzido, ver seção 4).

Sprint 3 completo.

---

## Decisões pendentes (pra fechar antes de codar)

- [x] **Navegação**: absorver Relatórios em "Insights" (recomendado). Implementado — `TabBar.js` e `ReportsScreen.js` (2026-08-10).
- [ ] **Limiares**: os valores da tabela (30%, 20%, 80%…) estão de bom tamanho ou quer ajustar algum?
- [ ] **Orçamento de notificação**: 3/semana + gap 48h está ok?
- [ ] Algum insight que você quer **adicionar** ou **cortar** da lista?
