---
name: mestre-financeiro
description: Conhecimento de finanças pessoais (orçamento 50/30/20, zero-based, envelopes, reserva de emergência, indicadores de saúde financeira) aplicado ao app Meu Bolso. Use ao avaliar se um número, tela, relatório ou regra do app faz sentido financeiramente, ou ao propor novas funcionalidades de orçamento/metas/dívidas.
---

# Mestre financeiro — referencial para o Meu Bolso

Este documento é o "consultor financeiro" do projeto: reúne os métodos consagrados
de finanças pessoais e traduz cada um em como ele se encaixa (ou não) no modelo do
app. Use para decidir **o que o app deveria mostrar** antes de decidir **como codar**.

## 1. Os métodos de orçamento que importam

### 50/30/20
Divide a **renda líquida** em três blocos:

| Bloco | % | O que entra |
|---|---|---|
| Necessidades | 50% | moradia, contas fixas, mercado, transporte, saúde, mínimo das dívidas |
| Desejos | 30% | lazer, restaurante, assinaturas, compras não essenciais |
| Futuro | 20% | reserva de emergência, investimentos, amortização de dívida além do mínimo |

Pontos-chave para o app:
- Os percentuais são **referência, não regra**. Variantes válidas: 60/20/20, 70/20/10.
  Quem está começando pode mirar 10% no bloco Futuro e subir gradualmente.
- Para calcular isso, o app precisa saber **qual categoria é necessidade, desejo ou
  futuro**. Hoje o Meu Bolso tem categorias com emoji/cor, mas **não tem esse eixo**.
  É a peça que falta para o 50/30/20 sair do papel.

### Zero-based (base zero) — "todo real tem um destino"
Receita − alocações = 0. Nada fica "solto". É a filosofia por trás do YNAB e do
EveryDollar. Exige um passo mensal de **alocar** o dinheiro antes de gastar.

Como isso conversa com o Meu Bolso: o conceito de **mês aberto** já é meio caminho —
abrir o mês informando o salário é exatamente o momento de alocar. Falta o outro
lado: um **orçamento por categoria** (quanto pretendo gastar em cada uma) para
comparar planejado × realizado.

### Envelopes
Versão prática do zero-based: cada categoria vira um "envelope" com saldo próprio;
gastou, o envelope esvazia. Bom para gastos variáveis (mercado, lazer).
No app, um envelope seria: `orçamento da categoria no mês − gasto realizado`.

### Regra prática de adoção
Leva cerca de três meses para o hábito pegar. Isso reforça uma decisão de produto:
o app precisa ser **rápido de alimentar** (o botão "+" já é o centro disso) e
**perdoar meses incompletos** em vez de exibir zeros que desanimam.

## 2. Indicadores de saúde financeira

Estes são os números que um consultor olharia. Marcados com ✅ o que o app já
calcula (em `src/db/reports.js`) e 🔲 o que ainda não existe.

| Indicador | Referência saudável | No app |
|---|---|---|
| Taxa de poupança | ≥ 20% da renda | ✅ `saving_rate`, `getFinancialProfile().savingRate` |
| Reserva de emergência | 3 a 6 meses de **despesas essenciais** | ⚠️ existe (`emergencyMonths`) mas com ressalva — ver abaixo |
| Comprometimento de renda com dívida | ≤ 30% da renda líquida | 🔲 dá para derivar de parcelas + fixas, não é exibido |
| Custo fixo sobre a renda | ≤ 50% | 🔲 o app já separa fixas × variáveis em Despesas, falta o % |
| Fluxo de caixa mensal | positivo | ✅ `cashFlow`, e o Início mostra o resultado do mês |
| Patrimônio líquido | crescente ao longo do tempo | ✅ `getNetWorth`, `getNetWorthSeries` |

### Ressalvas nos cálculos atuais (relevantes de verdade)

1. **Reserva de emergência está otimista.** Em `getFinancialProfile`, o cálculo é
   `(saldo + metas + investimentos) / despesa média`. Dois problemas conceituais:
   - usa **despesa total**, mas a definição correta é **despesa essencial** (sem lazer);
   - trata **todo investimento como líquido**, mas um CDB de longo prazo ou um imóvel
     não é reserva de emergência. Reserva precisa ser de **liquidez imediata**.
   Correção sugerida: marcar investimento como líquido/ilíquido e usar só despesas
   essenciais no denominador.

2. **`saving_rate` mede sobra, não poupança.** A fórmula é `(receita − despesa) / receita`.
   Isso é a **sobra do mês**, que não é a mesma coisa que dinheiro guardado — o app já
   tem `invested_rate` para o guardado de fato. O rótulo atual ("% do que entrou não
   virou despesa") está correto e honesto; só não confunda os dois ao criar telas novas.

3. **Receita prevista entra no resumo do mês.** `getMonthSummary` soma
   `income_paid + income_pending`. Financeiramente isso é uma **projeção**, não caixa.
   Está certo para planejar o mês, mas nunca use esse número como "dinheiro que tenho".
   Para caixa real, `getAvailableBalance()` (que filtra `paid = 1`) é o correto.

4. **Cartão de crédito não vira dívida no saldo.** Gasto no crédito tem `card_id` e não
   debita a conta — correto para o extrato, mas significa que o app **não mostra a
   fatura como passivo**. Financeiramente, fatura em aberto é dívida de curto prazo e
   deveria aparecer no patrimônio como valor negativo.

5. **`getNetWorth` não subtrai passivos.** Soma saldo + metas + investimentos + bens.
   Patrimônio líquido de verdade é **ativos − dívidas** (parcelas em aberto + fatura).
   Hoje o número é o bruto, e tende a parecer melhor do que é.

## 3. Hierarquia de prioridades (o que orientar o usuário a fazer)

Ordem consensual entre educadores financeiros, útil para as dicas do app (`TipCard`):

1. Sair do vermelho do mês (fluxo de caixa positivo).
2. Reserva mínima de 1 mês de despesas essenciais.
3. Quitar dívida cara (rotativo do cartão, cheque especial) — juros altos batem
   qualquer investimento.
4. Completar a reserva até 3–6 meses.
5. Investir para objetivos de médio/longo prazo.
6. Bens e consumo planejado.

O Meu Bolso tem os dados para saber **em qual degrau o usuário está** e personalizar
a dica — hoje as dicas não usam isso.

## 4. Oportunidades concretas para o app

Em ordem de valor por esforço:

1. **Eixo necessidade/desejo/futuro nas categorias** → destrava 50/30/20, custo fixo
   sobre renda e dicas personalizadas. Uma coluna nova em `categories`.
2. **Orçamento por categoria no mês** (planejado × realizado) → destrava envelopes e
   zero-based. Encaixa naturalmente no fluxo de "abrir o mês".
3. **Fatura do cartão como passivo** → corrige patrimônio e comprometimento de renda.
4. **Reserva de emergência corrigida** (essenciais + só o que é líquido).
5. **Degrau financeiro** → dica personalizada segundo a hierarquia acima.

## 5. Limite importante

O app pode e deve mostrar **os números do próprio usuário** e **referências públicas**
(50/30/20, 3–6 meses de reserva). O que ele **não** deve fazer é recomendar produtos
financeiros específicos, prever rendimento ou dizer "invista em X" — isso é
recomendação de investimento e exige profissional certificado.

## Fontes

- [Regra 50-30-20 — Serasa](https://www.serasa.com.br/score/blog/metodo-50-30-20-como-utilizar/)
- [Regra 50/30/20 — 99Pay](https://99app.com/blog/99pay/como-organizar-as-financas-pessoais-aprenda-a-regra-50-30-20/)
- [Zero-Based Budgeting — Ramsey Solutions](https://www.ramseysolutions.com/budgeting/how-to-make-a-zero-based-budget)
- [Zero-based vs Envelope — RealBudget](https://realbudget.app/zero-based-budgeting-vs-envelope-budgeting)
- [Types of budget plans — Experian](https://www.experian.com/blogs/ask-experian/types-of-budget-plans/)
- [4 types of budgets — U.S. Bank](https://www.usbank.com/financial-education/save/types-of-budgets.html)
- [Best budget apps 2026 — NerdWallet](https://www.nerdwallet.com/finance/learn/best-budget-apps)
