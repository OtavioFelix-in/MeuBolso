---
name: meubolso
description: Como o app Meu Bolso funciona — arquitetura, modelo de dados, convenções e como buildar/rodar. Use ao trabalhar no projeto de controle financeiro em claude/financas (telas, banco SQLite, cartões, contas fixas, meses abertos/fechados, gerar o APK).
---

# Meu Bolso — guia do app

App de **controle financeiro pessoal**, feito em **Expo SDK 57 + React Native 0.86**, com banco **SQLite local (expo-sqlite, API síncrona)**. É **100% offline**: nenhum servidor, nenhuma conta, tudo salvo no aparelho. Pasta: `claude/financas`. Pacote Android: `com.otavio.meubolso`.

> Antes de escrever qualquer código Expo, veja a doc versionada: https://docs.expo.dev/versions/v57.0.0/ (o Expo muda bastante entre versões).

## Convenções que valem pro app inteiro

- **Dinheiro é sempre INTEGER em centavos.** Nunca `float`. Formatação em `src/utils/money.js` (`formatMoney`, `digitsToCents`). O campo de valor funciona como caixa de mercado: só dígitos entrando pela direita.
- **Datas**: lançamento é string `'YYYY-MM-DD'` (hora local); mês é `'YYYY-MM'`. Helpers em `src/utils/date.js`. Nunca use `new Date('YYYY-MM-DD')` (vira UTC e volta um dia) — use `fromIsoDate`.
- **Soft delete**: toda tabela tem `uuid`, `updated_at`, `deleted`. Apagar = `deleted = 1` (preparado pra uma futura sincronização entre aparelhos).
- **Camada de banco** separada por domínio em `src/db/*`, reexportada por `src/db/index.js`. As telas fazem `import * as db from '../db'`.
- **Tema** claro/escuro via `src/theme-context.js` (`useTheme()` → `colors`). Paletas e catálogos em `src/theme.js`. Cor principal: verde `#2ED396`/`#00A870`.
- **Sem biblioteca de navegação**: navegação é feita à mão em `App.js` (estado de aba + telas secundárias com voltar). `src/app-context.js` expõe `month`, `navigate`, `back`, `openTransaction`, `refresh`, `hidden`.

## Estrutura de navegação (App.js)

Barra inferior com 5 abas: **Início · Despesas · Meses · Carteira · Relatórios**.
Telas secundárias (abrem "por cima", com botão voltar, a partir de atalhos no Início): **Contas fixas** (`bills`), **Parcelamentos** (`installments`), **Namorada** (`namorada`), **Agenda** (`agenda`). **Ajustes** é um bottom sheet (`SettingsScreen`).

`navigate(name)`: se for aba → troca aba; se for secundária → empilha; `'settings'` → abre o sheet. `back()` desempilha.

## Conceito central: mês ABERTO x FECHADO

O ponto mais importante do modelo. Ver `src/db/months.js`.

- Um mês só fica **aberto** quando o usuário clica em abrir (tabela `open_months`). Só aí as **contas fixas e o salário viram lançamentos previstos** naquele mês (`materializeMonth`, idempotente).
- Mês **fechado** mostra só **previsão** (`getMonthProjection`, não cria nada no banco).
- `ensureCurrentMonthOpen()` roda no `App.js` na 1ª vez: abre o mês atual e migra bancos antigos (marca abertos os meses que já tinham `recurrence` materializada).
- Telas **não** chamam `materializeMonth` automático — só `openMonth`/`materializeOpenMonths`.
- **Aba Meses** (`MesesScreen`): linha do tempo (`getMonthsTimeline`) com abrir (informando o salário do mês), fechar (`closeMonth` remove só os previstos não pagos) e editar salário.

## Modelo de dados (tabelas principais)

- `transactions` — o centro de tudo. Receitas e despesas. Campos-chave:
  - `kind` (`income`/`expense`), `amount_cents`, `date`, `paid` (0 = previsto), `category_id`, `account_id`, `card_id`.
  - `off_budget` (1 = **fora do saldo**: parcela no cartão de outra pessoa, aporte). Excluído de saldo/relatórios/extrato, mas continua rastreado.
  - `recurrence_id` / `installment_id` — quando o lançamento nasceu de uma conta fixa ou parcela.
- `recurrences` — contas fixas / receitas recorrentes (inclui o **salário**). `variable` (1 = valor muda todo mês → conta variável), `period` (`monthly`/`annual`), `due_day`, `start_month`/`end_month`, `card_id`.
- `installments` — compras parceladas; ao criar, geram N `transactions` (uma por mês). `off_budget` propaga pras parcelas.
- `accounts` — contas (conta corrente, carteira, poupança). Saldo = inicial + lançamentos pagos.
- `cards` — cartões de crédito (limite, uso no mês, disponível). `src/db/cards.js`. Gasto no crédito tem `card_id` e **não** debita a conta corrente. `getSpendingSplit` = conta × cartão.
- `investments` + `investment_moves` — aporte/resgate ajustam o valor atual; com `accountId`, criam transação `off_budget` na conta (debita o saldo).
- `assets` — bens (valor de compra × valor atual).
- `goals` + `goal_deposits` — metas (existem no banco, **fora da UI** desde a v5).
- `events` — Agenda: eventos com valor planejado × gasto real.
- `settings` (chave/valor), `open_months`.

Regras de saldo (em `src/db/reports.js`):
- **Saldo disponível** = contas − guardado em metas − aportes. **Patrimônio** = saldo + metas + investimentos + bens.
- O **Início** mostra o resultado **do mês** em destaque (receitas − despesas − guardado); o saldo acumulado é secundário.

## Salário (src/db/budget.js)

O salário é uma **recorrência de receita** identificada por `settings.salary_recurrence_id`.
- `saveSalary({cents, day, applyFrom})` — vale a partir de `applyFrom`; meses anteriores já abertos mantêm o valor antigo.
- `setMonthSalary(month, cents)` — define o salário só daquele mês (usado ao abrir). **Se ainda não há salário configurado, ele cria** (senão não salvava nada — bug já corrigido).

## O botão "+" (TransactionForm.js)

Centraliza o cadastro. Toggle **Única × Recorrente**:
- Única → cria um `transaction`.
- Recorrente → cria uma `recurrence` (período mensal/anual, dia, "o valor muda todo mês" = variável) e materializa nos meses abertos.
- **Forma de pagamento roteia o gasto**: crédito → escolhe cartão (`card_id`, conta nula); resto → conta.

## Despesas (DespesasScreen.js)

Abas **Todas / Fixas / Variáveis**:
- Fixas = recorrências `variable=0` + parcelas. Variáveis = recorrências `variable=1` (água, energia).
- Botão **"Registrar despesa"** em destaque. Contas fixas e Parcelamentos continuam como telas próprias.

## Carteira (WalletScreen.js)

Sub-abas: **Conta** (saldos + movimentações + split conta×cartão), **Investim.** (aporte escolhe a conta), **Cartões** (cadastrar/limite/encerrar), **Bens**.

## Como buildar o APK (importante)

O Android SDK está em `C:\Users\otavi\AppData\Local\Android\Sdk`; JDK 17 (Temurin) em `C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot`.

**O Gradle NÃO compila em caminho com acento** (`Programação a parte` vira `Programa??o`). Por isso o build acontece numa cópia em caminho ASCII: **`C:\Users\otavi\meubolso-build`**.

Fluxo (PowerShell):
1. Sincroniza a fonte: `robocopy "<financas>\src" "C:\Users\otavi\meubolso-build\src" /MIR` + copia `App.js`/`app.json` se mudaram.
2. `cd C:\Users\otavi\meubolso-build\android`; setar `JAVA_HOME` e `ANDROID_HOME`; `.\gradlew.bat assembleRelease --no-daemon`.
3. APK sai em `android\app\build\outputs\apk\release\app-release.apk`; copiar pra `Desktop\MeuBolso.apk`.
4. Se mexeu em `app.json` (ícone, plugins, softInputMode): rodar `npx expo prebuild -p android` na fonte e sincronizar `android/app/src/main/res` + manifest.

**Validar antes de buildar**: `npx expo export --platform android --output-dir <tmp>` pega erros de import/sintaxe em segundos, sem precisar de device.

**Emulador**: AVD `MeuBolso` (`emulator -avd MeuBolso`). Boot frio demora 2–3 min (tela preta é normal). Instalar: `adb install -r`. Print: `adb shell screencap -p /sdcard/x.png` + `adb pull` (NÃO usar `exec-out > arquivo` no PowerShell — corrompe o binário).

**Ícones**: `make-icons.js` (usa `sharp`, `npm i --no-save sharp`) gera carteira branca sobre verde em `assets/`.

## Notas

- Notificações (`src/notifications/`) só funcionam no APK final, **não no Expo Go** (limitação do Expo SDK 53+).
- Commits do Otávio **não** levam Co-Authored-By do Claude.
- Integração bancária (Open Finance/Pluggy ou import OFX) foi discutida mas **não** implementada — só planejamento.
