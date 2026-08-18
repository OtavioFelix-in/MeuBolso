# Planejamento — Front-end do Meu Bolso

> O planejamento anterior (onboarding, segurança, Sprint 3 de insights, nuvem/IA)
> está **concluído ou pausado por decisão do Otávio** — não é o foco agora.
> Este documento é focado **só em front-end**: como o app parece e se comporta
> visualmente, não em funcionalidade nova. Não mexe em `src/db/*` nem adiciona
> tela/relatório novo — só como as telas existentes são desenhadas.

## 0. Diagnóstico — por que o app "parece feito por IA"

Levantamento no código (2026-08-13), não opinião solta:

1. **100% dos ícones são emoji**, sem exceção — `theme.js` (`ACCOUNT_TYPES`,
   `PAYMENT_METHODS`, `INVESTMENT_TYPES`, `ASSET_TYPES`, categorias) e toda tela usam
   `emoji` como prop. Não há `@expo/vector-icons` nem nenhuma lib de ícone vetorial
   no projeto — `grep` por `vector-icons` no `src/` não retorna nada. Emoji renderiza
   diferente por fonte do sistema (Android/iOS/versão), varia de peso e estilo entre
   si (💼 é ilustrado, 🏦 é plano) e é o tell mais reconhecível de "protótipo rápido".
   `IconBubble` (`src/components/ui.js:217`) põe esse emoji dentro de um círculo colorido
   translúcido — o padrão exato que se vê em templates de fintech gerados às pressas.
2. **Zero fonte customizada.** Nenhum `expo-font`/`useFonts` no projeto — todo texto
   usa a fonte padrão do sistema (Roboto no Android, San Francisco no iOS). Funciona,
   mas não constrói identidade nenhuma; qualquer app React Native "cru" parece igual.
3. **Splash screen configurada pela metade.** Existe `assets/splash-icon.png`, mas
   `app.json` não tem a chave `"splash"` nem usa `expo-splash-screen` — o asset foi
   gerado e nunca ligado. Hoje a abertura do app é a tela branca/preta padrão do Expo.
4. **Zero microinteração.** Nenhum `Animated`, `Reanimated` ou `Moti` no projeto —
   troca de aba, abertura de sheet e salvar um lançamento são instantâneos e secos.
   Não há *skeleton loading*, nem feedback de "salvo com sucesso" além de o sheet fechar.
5. **Escala de espaçamento/raio não é um sistema, é número solto por componente.**
   `Card` usa `borderRadius: 20` (`ui.js:25`); botões, chips e barras usam 14, 12, 11,
   8 e 3 em arquivos diferentes, sem constante compartilhada. Não trava a UI, mas
   cada tela nova reinventa o próprio raio "por olho".
6. **Paleta de cor é o ponto mais forte hoje** — `palettes.light`/`palettes.dark`
   em `theme.js` são consistentes, o verde de marca (`#00A870`/`#2ED396`) é usado com
   disciplina, e o dark mode foi pensado (não é só inverter branco/preto). Isso não
   precisa mudar — é a base pra construir em cima.

## 1. Onde focar (ordem de impacto por esforço)

### 🥇 Ícones — trocar emoji por ícone vetorial
Maior impacto visual pelo menor esforço técnico: `@expo/vector-icons` já vem
embutido no pacote `expo` (SDK 57), **sem instalar dependência nova**. Trocar por
uma família consistente (ex.: `Feather` ou `Ionicons`, ambas na lib) resolve de
uma vez a inconsistência de peso/estilo.

**Mas atenção a uma distinção real do produto**: emoji em duas situações NÃO são
"ícone de UI" — são **conteúdo escolhido pelo usuário** (o emoji da categoria/conta
que a pessoa seleciona no `EmojiColorField`) e trocar isso tira uma feature, não só
um estilo. Separar os dois casos:
- **Ícone de UI/navegação/estado** (abas, botões, cabeçalhos, estados vazios,
  emoji fixo de `ACCOUNT_TYPES`/`PAYMENT_METHODS`/`INVESTMENT_TYPES`/`ASSET_TYPES`
  em `theme.js`) → candidato a virar ícone vetorial.
- **Emoji de categoria/conta escolhido pelo usuário** (`CATEGORY_EMOJIS`,
  `ACCOUNT_EMOJIS` em `CatalogForms.js`) → é personalização, faz parte do produto,
  não precisa mudar.

### 🥈 Tipografia
Adicionar 1–2 fontes via `expo-font`/Google Fonts (ex.: uma pro título/números
grandes tipo `Sora`/`Manrope`/`Plus Jakarta Sans`, e manter a do sistema pro corpo
de texto — ou uma família só, com pesos variados). Baixo esforço técnico (é só
`useFonts` + trocar `fontFamily` nos componentes de `ui.js`/`fields.js`), alto
ganho de identidade — é o que faz o app "ter uma cara" em vez de "ser um React
Native padrão".

### 🥉 Splash screen
Ligar o `assets/splash-icon.png` que já existe via `expo-splash-screen` +
`"splash"` em `app.json`. Esforço pequeno, e hoje é literalmente um asset pronto
sendo desperdiçado.

### Sistema de espaçamento/raio
Formalizar em `theme.js` uma escala compartilhada (ex.: `RADIUS = { sm: 8, md: 14,
lg: 20 }`, `SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }`) e migrar os
componentes de `ui.js`/`fields.js` pra usar as constantes em vez de número solto.
Não muda nada visualmente no primeiro momento — é a base pra parar de divergir
tela a tela.

### Microinterações (por último — é polimento, não fundação)
Sem dependência nova: a própria API `Animated` do React Native já cobre fade-in de
card, feedback de "salvo" e transição de aba. `Reanimated`/`Moti` só entrariam se
o resultado com `Animated` nativo não for suficiente — decisão pra revisitar depois
de ver o antes/depois.

## 2. O que NÃO mexer

- **Navegação manual em `App.js`** — continua sendo a decisão certa pro tamanho do
  app; nada aqui troca isso por lib de navegação.
- **Nenhuma tela, cálculo ou tabela nova.** Este plano é só a camada visual dos
  componentes que já existem (`src/components/ui.js`, `fields.js`, `charts.js`,
  `theme.js`) — as telas continuam chamando os mesmos componentes, só que
  redesenhados por dentro.
- **Paleta de cor atual** — funciona bem em claro/escuro, não é o problema.

## 3. Pendências de decisão

- [x] **Ícone vetorial**: `Feather`, aplicado na barra inferior, `RoundButton` e
  `IconBubble` (quando é ícone de UI, não emoji escolhido pelo usuário).
- [x] **Fonte**: `Inter` — pesquisado e é literalmente a fonte que o Banco Inter usa
  na própria marca (grátis, Google Fonts). Aplicada no app inteiro (2026-08-18).
- [x] **Splash screen** ligada via `expo-splash-screen`, fundo no gradiente de marca.
- [x] **Sistema de raio** (`RADIUS` em `theme.js`) aplicado em `ui.js`/`fields.js`.
- [x] **Animação de toque** (`useTapAnim`, `src/hooks/useTapAnim.js`) em todo
  componente clicável — Card, Button, Chip, abas, RoundButton, FAB.
- [x] **Ícone do app** trocado (arte nova do usuário) + identidade de gradiente
  verde-escuro-pro-preto aplicada com moderação (cartão de resultado do Início).
- [x] **Ajustes** reescrito como menu de grupos (era lista única sem fim).

Front-end desta leva está concluído. Falta ainda, se quiser continuar polindo depois
do item 4 abaixo: emoji de UI que sobrou fora da barra inferior (tipos de
conta/investimento/bem em `theme.js`, cabeçalhos de tela), e animações mais
elaboradas (número contando, gráfico animando ao abrir aba) — hoje só tem o
toque/escala, não isso.

## 4. Próximo horizonte: multiusuário + backend (NÃO decidido, só registrado)

Discussão de 2026-08-18: Otávio quer escalar o Meu Bolso pra outros usuários e,
mais pra frente, ligar num banco de dados de verdade (hoje é só SQLite local, sem
login, sem servidor). **Nada disso está decidido ainda — é só o registro da
conversa pra não perder o fio quando a gente voltar nisso.**

### O que já ajuda
Toda tabela já tem `uuid`, `updated_at` e `deleted` — desenhado desde o início
pensando numa futura sincronização (ver `meubolso` skill). Migrar pra sync não
exige reescrever o modelo de dados do zero.

### O que falta pra virar multiusuário de verdade
- **Autenticação**: hoje "dono do aparelho = dono dos dados". Precisa de login e
  isolar dado por usuário no backend (ou por instância, se cada um tiver seu próprio
  espaço).
- **Decisão de arquitetura, ainda em aberto**:
  - **Local-first com sincronização em background** — mantém "funciona sem
    internet" (o diferencial do app hoje), mas sincronizar direito (conflito de
    edição em dois aparelhos, merge) é a parte mais difícil de implementar.
  - **Online-first com backend obrigatório** — mais simples de construir, mas
    perde a proposta offline-first que o app tem hoje.
- **Ideia inicial do Otávio a explorar**: hospedar o banco no **OneDrive** do
  próprio usuário, em vez de backend tradicional (Supabase/Firebase/servidor
  próprio). Vale investigar depois: OneDrive não é banco de dados (é storage de
  arquivo) — daria pra sincronizar um arquivo SQLite via OneDrive (cada usuário com
  o próprio arquivo, sem multiusuário-num-servidor-só), mas escrita concorrente
  em arquivo sincronizado por serviço de nuvem de terceiros tende a gerar conflito
  (dois aparelhos escrevendo "ao mesmo tempo" sem lock). Funciona bem pra "um
  usuário, vários aparelhos dele"; não resolve "muitos usuários independentes"
  sozinho. Comparar depois com Supabase/Firebase (multiusuário de verdade, mais
  rápido de sair do chão) vs. backend próprio (mais controle, mais trabalho).
- **TypeScript sobe de prioridade** se isso avançar: contrato de tipo entre
  app e servidor evita a classe de bug mais comum nessa transição (schema
  divergindo entre front e back sem avisar em tempo de compilação).

### Já implementado nessa direção (2026-08-18): avatar no canto superior esquerdo
Login em si fica pra depois, mas já criamos o ponto de entrada visual: um avatar
(iniciais do nome, círculo verde) no canto superior esquerdo do Início — igual
Banco Inter/Itaú —, que hoje abre a edição do nome (`ProfileSheet`, só o campo
"como o app deve te chamar"). `Header` (`ui.js`) ganhou um slot `left` genérico
pra isso, reutilizável em outras telas se fizer sentido.

### Ideia registrada: pedir mais dado no cadastro, pensando no banco futuro
Otávio sugeriu já começar a coletar mais informação de perfil no onboarding
(além do nome), preparando terreno pra quando existir backend de verdade —
e observou que isso muda até o fluxo de acesso com biometria (hoje a biometria
só desbloqueia o app local; com conta de verdade, ela também precisaria
autenticar contra o backend, não só liberar a tela).

**Não implementado ainda — só registrado.** Antes de pedir mais campo no
onboarding vale decidir junto com a arquitetura do item acima, porque:
- Pedir dado (e-mail? CPF? telefone?) sem ter backend pra guardar com segurança
  é pior que não pedir — ficaria só solto em `settings` do SQLite local, sem a
  criptografia/isolamento que dado sensível desse tipo pede.
- O tipo de campo (e-mail vs. telefone vs. nada, só conta social) depende de
  qual vai ser o método de login (e-mail/senha, OAuth do Google, magic link...),
  que também não foi decidido.
- Onboarding mais longo tem custo real de abandono (o próprio `PLANEJAMENTO.md`
  antigo já registrava isso: "onboarding longo é onde apps perdem usuário") — só
  vale alongar se o dado pedido já tiver uso imediato, não "pra guardar por guardar".

Retomar isso junto da decisão de backend (item acima), não antes.

Sem próximo passo definido — retomar quando o Otávio quiser aprofundar.
