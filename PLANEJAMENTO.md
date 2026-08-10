# Planejamento — Meu Bolso: de app pessoal a produto

> Documento de planejamento. **Nada aqui está implementado ainda** — é o roadmap
> acordado para transformar o Meu Bolso num app de controle financeiro
> profissional, mantendo a filosofia **offline-first (nuvem opcional)**.
>
> Decisões-base já tomadas:
> - **Filosofia:** offline-first de verdade. Nuvem (backup) e IA são recursos
>   *opcionais* que o usuário liga se quiser. O app funciona 100% sem internet.
> - **IA (Gemini):** por enquanto **só planejamento** — não implementar nesta fase.
> - Este arquivo é a fonte de verdade do roadmap; evolui conforme a gente decide.

---

## 0. Diagnóstico do estado atual

A base é sólida e já tem nível profissional em vários pontos:

- Banco separado por domínio (`src/db/*`), dinheiro sempre em centavos, tema
  claro/escuro, e `uuid`/`updated_at`/`deleted` em todas as tabelas (já preparado
  para uma futura sincronização).
- **Backup local já existe**: `exportBackup`/`importBackup` (JSON) e `exportSpreadsheet`
  (CSV) na tela de Ajustes. O "passar para outro celular" já está parcialmente
  resolvido offline — falta só a camada de nuvem opcional.

Os "tells" de app pessoal são poucos e explícitos (fáceis de remover):

- Aba **Namorada** (`NamoradaScreen`) e categoria **"Namorada"** com subs pessoais.
- Categoria **"Faculdade"** hardcoded em `DEFAULT_CATEGORIES`.
- Textos com piada interna (ex.: *"Feito pra durar mais que a força de vontade de janeiro"*).

---

## 1. Onboarding (primeiro acesso)

**Princípio:** pedir o mínimo para o app fazer sentido na primeira tela; empurrar o
resto para depois. Onboarding longo é onde apps perdem usuário.

### Manter (núcleo)
- Nome do usuário → alimenta a saudação personalizada ("Bom dia, João").
- Saldo atual da conta.
- Tem renda fixa mensal? → cadastro do salário inicial (valor + dia).

### Adicionar (faltou e importa)
- **Perfil de categorias** (ex.: Estudante / CLT / Autônomo / Família) que ajusta o
  preset de categorias — melhor que fazer o usuário marcar 16 checkboxes.
- **Dia de fechamento/vencimento do cartão** (o modelo já tem cartões; sem isso a
  fatura fica errada).
- **Permissão de notificação** pedida *com contexto* ("quer que eu te lembre das
  contas?"), nunca o popup seco do Android.
- **Moeda/locale** preparado no código (mesmo lançando só BRL) para não travar
  internacionalização no futuro.
- Tela final "Tudo pronto, {nome}!" com resumo do que foi configurado.

### Cortar / mudar (análise crítica)
- ❌ **Bloqueio de palavrões/nomes ofensivos:** cortar. É o nome do próprio usuário,
  no app dele, que só ele vê — não protege ninguém e gera falso-positivo (bloquear
  nomes reais). Validar apenas vazio/comprimento.
- 🟡 **Escolher categorias uma a uma:** simplificar. Trazer tudo pronto; personalizar
  fica nas Configurações. No máximo perguntar o *perfil* acima.
- 🟡 **Registrar meses anteriores no onboarding:** adiar. Padrão = "começar limpo";
  oferecer importar histórico depois.

### Requisito técnico
- Onboarding **retomável e idempotente**: se fechar no meio, volta de onde parou.
  Guardar `onboarding_step` em `settings`.

---

## 2. Tutorial inicial

**Princípio:** tutorial *just-in-time* (contextual) supera carrossel *upfront* — que
todo mundo pula.

- **Empty states que ensinam:** Início vazio mostra "Toque no + pra registrar seu
  primeiro gasto". O app se explica sendo usado.
- No máximo **3 dicas contextuais** (tooltips) na primeira visita a cada aba, e somem.
- Card explicando o conceito **mês ABERTO × FECHADO** — é o mais original do app e o
  menos óbvio; merece um mini-explicativo.

---

## 3. Configurações completas

Reorganizar em grupos:

- **Conta & Perfil:** nome, saudação, moeda, editar salário.
- **Aparência:** tema (já existe), tamanho da fonte, cor de destaque.
- **Acessibilidade:** tamanho da fonte, alto contraste, reduzir animações, labels
  para leitor de tela.
- **Notificações:** as atuais + as inteligentes (seção 6).
- **Dados & Backup:** exportar (já existe) + **backup em nuvem (opcional)** + importar
  + **apagar todos os dados** (exigido pelas lojas).
- **Segurança:** PIN/biometria para abrir o app (é dado financeiro — importante).
- **Sobre:** versão, créditos, dev, **política de privacidade**, **termos de uso**,
  avaliar na loja, contato/suporte.
- **Extras profissionais:** idioma, "restaurar padrões", changelog/novidades e —
  quando houver nuvem/IA — painel de **controle de privacidade** (o que sai do aparelho).

---

## 4. Tirar a aparência de app pessoal

Ordenado por impacto × esforço:

1. **Remover/generalizar a aba e a categoria "Namorada"** (tell #1).
2. Categorias hardcoded pessoais ("Faculdade") → dirigidas pelo perfil do onboarding.
3. Textos com piada interna → tom acolhedor, porém neutro.
4. **Empty states, loading e erros humanos** (hoje há `Alert` cru): produto trata,
   app pessoal não.
5. Identidade visual: splash screen, tela "Sobre" decente, logo/nome consistentes
   (ícone já existe).
6. Microinterações: feedback ao salvar, transição de abas.

**Não mexer:** a navegação manual em `App.js` é rápida e funcional — não trocar por
biblioteca de navegação só por trocar; não é isso que dá cara de pessoal.

---

## 5. Inteligência Artificial (Gemini) — SÓ PLANEJAMENTO nesta fase

Registrado para o futuro. Dois problemas que precisam de decisão **antes** de codar:

- **A chave não pode morar no app:** chave do Gemini dentro do APK é extraível →
  abuso/custo no nome do dono. IA em escala exige **backend** que segura a chave.
- **Privacidade × offline:** mandar gastos ao Gemini = enviar dado financeiro ao
  Google. Exige **consentimento explícito** e, idealmente, enviar apenas **resumos
  agregados** (não a lista crua de transações).

**Arquitetura recomendada — separar "insights" de "IA":**
- Grande parte das ideias (gastou acima da média, categoria subiu X%, padrões) é
  **estatística local**: offline, grátis, instantânea, privada. → Ver seção 6/Sprint 3.
- Reservar o Gemini para o que só ele faz bem: **narrar** esses números em linguagem
  natural e responder perguntas abertas. A IA *narra* insights que o app já calculou.

**Ideias válidas para o futuro:** categorização automática por texto ("iFood" →
Delivery), coach que responde perguntas, detectar assinatura esquecida.
**Linha vermelha:** nada de conselho de investimento personalizado (área regulada).

---

## 6. Notificações inteligentes (locais)

Quase tudo é computável com os dados locais — barato e valioso, sem IA nem nuvem:

- Gastou acima da média / perto do limite do orçamento.
- Conta vence amanhã; conta variável (água/luz) ainda não lançada perto do vencimento.
- Cartão: fatura fechou / vence em 3 dias / uso passou de 80% do limite.
- Salário caiu (dia do pagamento).
- Meta quase concluída / aporte sugerido.
- Resumo semanal/mensal ("essa semana: R$ 340, -15% vs. média").
- "Faz X dias sem registrar nada" (engajamento sem ser chato).

**Crítica:** notificação demais → usuário desliga tudo. Implementar **orçamento de
notificação** (máx. N por semana, priorizado) e controle granular. Qualidade > quantidade.

---

## 7. Roadmap por sprints

> Discordância registrada: **não** tratar como um único sprint — vira um mês sem
> nada testável. Quebrado por "maior impacto na percepção com menor esforço".

### 🥇 Sprint 1 — "Deixar de ser meu app"
*Maior impacto na percepção, mais barato, sem backend/IA/nuvem.*
1. Remover/generalizar tudo que é pessoal (Namorada, textos, categorias por perfil).
2. Onboarding enxuto (nome, saldo, renda, perfil, notificação) + retomável.
3. Empty states, tratamento de erro humano, revisão de tom dos textos.
4. Tutorial contextual (coachmarks + card do "mês aberto/fechado").

### 🥈 Sprint 2 — Configurações & Segurança
*Um app financeiro sem trava e sem política de privacidade não entra na loja.*
5. Tela de Configurações completa (acessibilidade, fonte, contraste).
6. PIN/biometria.
7. Política de privacidade + termos + "apagar meus dados".

### 🥉 Sprint 3 — Insights locais + Notificações inteligentes
*Diferencial de valor, sem depender de nuvem/IA — direto sobre os dados existentes.*
8. Motor de estatística local (médias, tendências, alertas por categoria).
9. Notificações inteligentes com orçamento de disparo.
10. Tela de "Insights".

### Sprint 4+ — Nuvem, IA e produto (decisão de negócio antes)
*Exige backend, custo e decisão sobre virar produto de verdade.*
11. Backup em nuvem opcional (Firebase — Storage + login Google).
12. IA Gemini via backend, narrando os insights do Sprint 3.
13. Monetização, publicação nas lojas, integração bancária (Open Finance/Pluggy).

---

## Anexo — Pendências de decisão

- [ ] Nome/marca definitivos e identidade visual (logo, splash).
- [ ] Onde hospedar o backend quando chegar a fase de nuvem/IA (Firebase free, etc.).
- [ ] Modelo de monetização (grátis, assinatura, freemium).
- [ ] Escopo de internacionalização no lançamento (só BRL/pt-BR?).
