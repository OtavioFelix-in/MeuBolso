# 💸 Meu Bolso

O Meu Bolso nasceu de um gargalo financeiro meu: eu precisava de um app que atendesse do
jeito que eu organizo minha vida financeira, e não encontrei um que servisse. Então criei
o meu — **100% manual e offline**, feito com Expo (SDK 57) e React Native. Tudo fica salvo
só no aparelho (SQLite) — sem conta, sem servidor, sem anúncio. O objetivo não é só resolver
isso pra mim: é ajudar qualquer pessoa que também tenha dificuldade em lidar com o próprio
dinheiro a enxergar, mês a mês, pra onde ele está indo.

## Rodar

```bash
cd financas
npm install
npx expo start
```

Abra no **Expo Go** (celular) lendo o QR code, ou aperte `a` pra abrir num emulador Android.

> No Expo Go os **lembretes ficam desligados** (limitação do próprio Expo). Eles funcionam
> normalmente no APK gerado (`eas build` / dev build).

## O que dá pra fazer

- **Início (dashboard):** saldo disponível, receitas/despesas do mês, investimentos,
  patrimônio, quanto sobrou, % economizado, rosca de "pra onde o dinheiro foi", barras de
  receita×despesa, evolução do patrimônio e próximos vencimentos. O olhinho 👁️ esconde
  todos os valores.
- **Extrato:** todos os lançamentos agrupados por dia, com busca e filtros (tipo, situação,
  categoria, conta).
- **Agenda:** calendário do mês, **contas fixas** (com histórico de pagamento e média) e
  **compras parceladas** (parcela atual, quanto falta, previsão de término e quanto pesa em
  cada mês à frente).
- **Planos:** **metas** (quanto guardar por mês, previsão de chegada), **investimentos**
  (rentabilidade, distribuição da carteira, aportes) e **patrimônio** (bens).
- **Relatórios:** perguntas respondidas com números ("onde gasto mais?", "qual categoria
  mais cresceu?", "quanto falta pras parcelas?"), **dashboard de hábitos** com comparação
  mês a mês, e **perfil financeiro** (reserva de emergência, taxa de poupança, fluxo de
  caixa, etc.).
- **Ajustes:** contas, categorias/subcategorias, notificações, tema claro/escuro e
  **backup** (exportar `.json` e `.csv`, importar `.json`).

## Como está organizado

```
financas/
├─ App.js                 # navegação por abas (feita à mão) + FAB de novo lançamento
├─ src/
│  ├─ db/                 # SQLite: um arquivo por domínio, reexportados por db/index.js
│  │  ├─ core.js          #   conexão, schema, seed, settings, helper save()
│  │  ├─ catalog.js       #   contas e categorias
│  │  ├─ transactions.js  #   lançamentos (receita/despesa, previsto/pago)
│  │  ├─ recurrences.js   #   contas fixas → materializam lançamentos por mês
│  │  ├─ installments.js  #   parcelamentos → geram as N parcelas
│  │  ├─ plans.js         #   metas, investimentos, bens
│  │  ├─ reports.js       #   saldos, séries dos gráficos, relatórios inteligentes
│  │  └─ backup.js        #   exportar/importar tudo + CSV
│  ├─ components/         # kit de UI (ui.js), campos (fields.js), gráficos SVG (charts.js)
│  ├─ screens/            # uma tela por aba + Ajustes
│  ├─ notifications/      # lembretes locais (expo-notifications)
│  ├─ utils/              # dinheiro (centavos), datas pt-BR, comprovantes
│  ├─ theme.js            # paletas, catálogos e categorias padrão
│  └─ theme-context.js    # tema claro/escuro (salvo no banco)
```

## Decisões que valem lembrar

- **Dinheiro é sempre `INTEGER` em centavos.** Nada de `float` — as somas do banco batem no
  último centavo. Formatação em `utils/money.js`.
- **Contas fixas e parcelas viram lançamentos de verdade** (`recurrence_id` / `installment_id`),
  com `paid = 0` enquanto previstos. Assim dashboard, calendário e relatórios leem tudo de um
  lugar só. `materializeMonth()` é idempotente — abrir o mês de novo não duplica nada.
- **Saldo disponível** = saldo das contas − o que foi guardado em metas/investimentos.
  **Patrimônio** = saldo + metas + investimentos + bens.
- Toda tabela tem `uuid`, `updated_at` e `deleted` (soft delete), preparando o terreno pra
  uma futura sincronização entre aparelhos.
- Antes de mexer em código Expo, ver `AGENTS.md`.

## Licença

Todos os direitos reservados © Otávio Felix Da Silva. Este código é disponibilizado
publicamente para visualização e portfólio, mas seu uso, cópia, modificação ou
redistribuição não são autorizados sem permissão expressa do autor.
