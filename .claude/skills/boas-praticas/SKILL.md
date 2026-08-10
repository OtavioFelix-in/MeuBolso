---
name: boas-praticas
description: Boas práticas de programação aplicadas ao Meu Bolso — estrutura de pastas, convenções React Native/Expo, migrações de SQLite versionadas, segurança de queries, lint/format e testes. Use ao escrever ou revisar código do app, ao criar arquivos novos, ao mexer no schema do banco, ou antes de commitar.
---

# Boas práticas — Meu Bolso

Referencial de qualidade de código para o projeto. Aplique ao escrever código novo
e ao revisar o existente. Sempre que uma regra aqui conflitar com o padrão já
adotado no arquivo que você está editando, **siga o arquivo** e anote a divergência
em vez de reescrever tudo no meio de outra tarefa.

## 1. Estrutura e responsabilidades

A separação atual está correta e deve ser preservada:

```
src/db/*        → acesso a dados. Único lugar com SQL.
src/screens/*   → uma tela por arquivo. Não escreve SQL, só chama db.*
src/components/ → reutilizáveis. ui.js e fields.js são a base visual.
src/utils/*     → funções puras (money, date, receipts). Sem dependência de UI.
```

Regras derivadas:
- **SQL só existe em `src/db/`.** Se uma tela precisa de um dado novo, crie a função
  na camada db e exporte via `src/db/index.js` — não escreva query na tela.
- **`src/utils/` é puro.** Nada de `import` de React, tema ou banco ali. Isso é o que
  torna esses arquivos testáveis sem simulador.
- **Um arquivo passando de ~500 linhas é sinal de que há mais de uma
  responsabilidade dentro dele.** Hoje `SettingsScreen.js` (518) e `ReportsScreen.js`
  (481) são os candidatos naturais a extrair sub-componentes.

## 2. Convenções que não se negociam neste projeto

Estas já valem e quebrá-las gera bug silencioso de dinheiro ou de data:

- **Dinheiro é `INTEGER` em centavos.** Nunca `float`, nunca `REAL` no schema.
  Formatação só em `src/utils/money.js`.
- **Data de lançamento é string `'YYYY-MM-DD'` local; mês é `'YYYY-MM'`.**
  Nunca `new Date('YYYY-MM-DD')` — o JS interpreta como UTC e volta um dia.
  Use `fromIsoDate` de `src/utils/date.js`.
- **Soft delete:** apagar é `deleted = 1` + `updated_at`, nunca `DELETE FROM`.
  Toda query de leitura precisa de `WHERE deleted = 0`.
- **Toda linha nova tem `uuid` e `updated_at`** — o helper `save()` em `src/db/core.js`
  já cuida disso; use-o em vez de escrever INSERT/UPDATE na mão.

## 3. Banco de dados

### Queries parametrizadas — sempre
Use `?` com array de parâmetros. Nunca concatene valor em string SQL. O projeto já
faz isso de forma consistente; a exceção são **nomes de tabela/coluna** interpolados
em helpers como `save()`, `softDelete()` e `addColumnIfMissing()` — aceitável porque
esses nomes vêm do próprio código, nunca de entrada do usuário. **Mantenha assim:**
nunca deixe um identificador vindo de input chegar nesses helpers.

### Migrações versionadas (dívida técnica atual)
O padrão recomendado é `PRAGMA user_version` com blocos numerados que rodam uma
única vez, em ordem. Hoje o projeto usa `addColumnIfMissing()` em `runMigrations()`
— funciona para adicionar colunas, mas **não cobre** renomear coluna, mudar tipo,
backfill de dados ou criar índice condicional, e a lista cresce indefinidamente.

Quando a próxima mudança de schema for além de "adicionar coluna", migre para:

```js
const MIGRATIONS = [
  // v1 → v2
  (db) => { db.execSync(`...`); },
];

function runMigrations() {
  const { user_version: v } = db.getFirstSync('PRAGMA user_version');
  for (let i = v; i < MIGRATIONS.length; i++) {
    db.withTransactionSync(() => {
      MIGRATIONS[i](db);
      db.execSync(`PRAGMA user_version = ${i + 1}`);
    });
  }
}
```

Regra de ouro: **se você publicar um APK com schema mudado e sem migração, o app
quebra na cara de quem já tem dados.** Isso é irreversível para o usuário.

### Transações
Operações que precisam acontecer juntas devem usar `db.withTransactionSync()`.
Casos claros no projeto: criar um parcelamento (gera N transações),
`materializeMonth()`, `closeMonth()` e `wipeAllData()`. Hoje elas rodam soltas —
uma falha no meio deixa o banco pela metade.

### Índices
Já existem para `date`, `category_id`, `installment_id`, `recurrence_id`.
Ao adicionar uma query nova que filtra por coluna sem índice em tabela que cresce
(`transactions` acima de tudo), avalie criar o índice junto.

## 4. React Native / Expo

- **Antes de escrever qualquer código Expo, confira a doc versionada:**
  https://docs.expo.dev/versions/v57.0.0/ — a API muda bastante entre SDKs.
- Componentes funcionais com hooks. Sem classes.
- **`StyleSheet.create` fora do componente**, não objeto inline recriado a cada render.
- Listas longas usam `FlatList` (virtualizada), não `.map()` dentro de `ScrollView`.
- `useMemo`/`useCallback` só onde há custo real (consulta ao banco, lista grande).
  Otimização preventiva em tudo só polui o código.
- **Chave de lista estável**: use `id` ou `uuid`, nunca o índice do array — com soft
  delete e reordenação, índice causa item errado na tela.
- Estado do app vive em `src/app-context.js`. Não introduza uma lib de estado global
  (Redux/Zustand) sem necessidade concreta — o app é pequeno demais para isso.

## 5. Ferramentas ausentes (e a ordem de adotar)

O projeto hoje **não tem lint, formatter nem teste**. Ordem sugerida, da maior para
a menor relação valor/esforço:

1. **`npx expo export --platform android`** — já disponível, sem instalar nada.
   Pega erro de import e sintaxe em segundos. Use como *smoke test* antes de todo build.
2. **ESLint com `eslint-config-expo`** — configuração oficial, pega erro real
   (variável não usada, hook com dependência faltando) e não só estilo.
3. **Prettier** — encerra discussão de formatação. Rode uma vez em tudo, commit
   separado só de formatação, para não poluir diffs futuros.
4. **Testes com Jest** — comece pelo que é puro e de alto risco: `src/utils/money.js`,
   `src/utils/date.js` e as regras de `src/db/reports.js`. Um erro de centavo ou de
   fuso é exatamente o tipo de bug que passa despercebido na tela.
5. **TypeScript** — o maior ganho de longo prazo e o maior esforço. Se adotar, faça
   incremental (`allowJs`), começando por `src/db/` e `src/utils/`.

## 6. Git e commits

- Commits pequenos, com mensagem em português, no imperativo:
  "Corrige salário do mês ao abrir" e não "correções".
- **Commits do Otávio não levam `Co-Authored-By` do Claude.**
- Não commitar: `node_modules/`, `android/app/build/`, `.expo/`, `.idea/`, `*.apk`,
  keystore de release. Verifique o `.gitignore` antes do primeiro push.
- Nunca commitar chave, token ou keystore de assinatura.

## 7. Checklist antes de dar por pronta uma alteração

- [ ] SQL ficou dentro de `src/db/`?
- [ ] Query nova filtra `deleted = 0`?
- [ ] Valor em centavos inteiro, sem `float`?
- [ ] Data construída via helper de `src/utils/date.js`?
- [ ] Mudou schema? Tem migração e ela roda em banco antigo sem apagar dado?
- [ ] `npx expo export --platform android` passou?

## Fontes

- [SQLite — Expo Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo SQLite: guia offline-first](https://medium.com/@aargon007/expo-sqlite-a-complete-guide-for-offline-first-react-native-apps-984fd50e3adb)
- [Navigating SQLite Database Migrations in React Native](https://medium.com/@hamzash863/navigating-sqlite-database-migrations-in-react-native-786d418655e6)
- [React Native Best Practices 2026 — Applighter](https://www.applighter.com/blog/react-native-best-practices)
- [25 React Native Best Practices — eSparkinfo](https://www.esparkinfo.com/blog/react-native-best-practices)
