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

- [ ] **Ícone vetorial**: `Feather` (mais fino/minimalista) ou `Ionicons` (mais
  cheio/amigável)? Ajuda ver os dois lado a lado nas telas reais antes de decidir.
- [ ] **Fonte**: nome/estilo de referência (alguma fonte de app que você gosta?)
  ou eu sugiro 2-3 opções pra comparar.
- [ ] **Nível de animação**: só o básico (fade/slide nativo) ou vale investir em algo
  mais chamativo (ex.: número contando, gráfico animando ao abrir a aba)?
- [ ] **Ordem de execução**: seguir a ordem de impacto acima (ícones → fonte →
  splash → sistema de espaçamento → microinteração) ou priorizar diferente?
