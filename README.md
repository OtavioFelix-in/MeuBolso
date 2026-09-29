<div align="center">

<img src="assets/icon.png" width="110" alt="Meu Bolso" />

# Meu Bolso 💸

**O controle financeiro que nasceu de um gargalo meu.**

![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-100%25%20offline-003B57?logo=sqlite&logoColor=white)
![Android](https://img.shields.io/badge/Android-APK-3DDC84?logo=android&logoColor=white)

</div>

---

## 💚 A história

Eu precisava de um app que atendesse do jeito que **eu** organizo minha vida financeira, e não encontrei nenhum que servisse. Então criei o meu.

O **Meu Bolso** é 100% manual e offline: tudo fica salvo só no aparelho, sem conta, sem servidor e sem anúncio. O objetivo não é só resolver o meu problema, é ajudar qualquer pessoa que também tenha dificuldade com o próprio dinheiro a enxergar, mês a mês, pra onde ele está indo. 💚

---

## ✨ Funcionalidades

**Organização**
- ➕ Botão **"+"** que cadastra um lançamento **único** ou **recorrente**, com a forma de pagamento decidindo pra onde vai o gasto (crédito usa o cartão, o resto sai da conta)
- 🧾 **Contas fixas** e **variáveis** (água, energia), com dia de vencimento
- 🔢 **Parcelamentos**: parcela atual, quanto falta e quanto pesam nos meses à frente
- 💳 **Cartões de crédito** com limite, uso no mês e valor disponível
- 🗂️ **Categorias** personalizáveis, com emoji e cor
- 📎 **Comprovantes**: anexe foto ou imagem a um lançamento

**Visão do mês**
- 🏠 **Início** com o resultado do mês em destaque (receitas − despesas − guardado), separando o que você já tem do que ainda é previsão
- 📆 **Meses abertos e fechados**: só o mês que você abre gera as contas fixas e o salário; os demais mostram só a previsão
- 🗓️ **Agenda** de eventos com valor planejado × gasto real
- 👁️ Olhinho que **esconde todos os valores**

**Patrimônio e relatórios**
- 🏦 **Carteira** com contas, saldos, investimentos (aportes e resgates) e bens
- 📊 **Relatórios** que respondem com números: "onde gasto mais?", "qual categoria mais cresceu?"
- 🔥 **Hábitos** com comparação mês a mês e **perfil financeiro** (reserva de emergência, taxa de poupança, fluxo de caixa)

**Experiência**
- 🔐 **Bloqueio por biometria**
- 🔔 **Lembretes** de vencimento que funcionam com o app fechado
- 🌙 **Tema claro e escuro**
- 💾 **Backup** local: exportar em `.json` e `.csv`, importar `.json`
- 📴 **100% offline**, sem nenhuma conexão com a internet

---

## 🛠️ Tecnologias

- **React Native 0.86** + **Expo SDK 57**
- **expo-sqlite** com API síncrona: banco local, o app funciona sem internet
- **expo-notifications**: lembretes locais agendados
- **expo-local-authentication**: biometria
- **react-native-svg**: gráficos próprios
- **Inter** (Google Fonts) como fonte do app inteiro
- **JavaScript** puro, sem framework de UI externo (componentes próprios)

---

## 🏗️ Arquitetura

Offline-first: o **SQLite é a fonte da verdade** e mora no aparelho. Não existe backend.

```
financas/
├── App.js                     # entrada: navegação à mão (abas + telas secundárias) e botão "+"
├── src/
│   ├── theme.js               # tokens: cores, espaçamento, tipografia, catálogos
│   ├── theme-context.js       # provedor de tema claro/escuro
│   ├── db/                    # SQLite, um arquivo por domínio (reexportados por index.js)
│   │   ├── core.js            #   conexão, schema, seed
│   │   ├── transactions.js    #   lançamentos (receita/despesa, previsto/pago)
│   │   ├── recurrences.js     #   contas fixas e salário
│   │   ├── installments.js    #   parcelamentos → geram as N parcelas
│   │   ├── months.js          #   mês aberto/fechado, projeção, linha do tempo
│   │   ├── cards.js           #   cartões de crédito
│   │   ├── reports.js         #   saldos e séries dos gráficos
│   │   └── backup.js          #   exportar/importar tudo + CSV
│   ├── screens/               # Início, Despesas, Meses, Carteira, Relatórios e Ajustes
│   ├── components/            # kit de UI, campos, formulários e gráficos SVG
│   ├── hooks/                 # animações de entrada e de toque
│   ├── security/              # biometria
│   ├── notifications/         # lembretes locais
│   └── utils/                 # dinheiro (centavos), datas pt-BR, comprovantes, backup
├── DESIGN.md                  # padrão visual e de movimento
└── PLANEJAMENTO.md            # planejamento do front-end
```

**Decisões que valem lembrar**

- 💰 **Dinheiro é sempre `INTEGER` em centavos.** Nada de `float`, então as somas batem no último centavo.
- 📅 **Datas** são `'YYYY-MM-DD'` (hora local) e meses são `'YYYY-MM'`.
- 🔁 **Contas fixas e parcelas viram lançamentos de verdade**, com `paid = 0` enquanto previstos. Dashboard, agenda e relatórios leem tudo de um lugar só, e abrir o mês de novo não duplica nada.
- 🗑️ **Soft delete**: toda tabela tem `uuid`, `updated_at` e `deleted`, preparando o terreno pra uma futura sincronização entre aparelhos.

---

## 🚀 Rodando o projeto

**Desenvolvimento** (com o app Expo Go no celular):

```bash
git clone https://github.com/OtavioFelix-in/MeuBolso.git
cd MeuBolso
npm install
npx expo start
```

**Gerar o APK** (build local com Android SDK e JDK 17):

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
# APK em: android/app/build/outputs/apk/release/app-release.apk
```

Depois é só mandar o `.apk` para o celular, tocar nele e permitir a instalação.

> Os lembretes **não** funcionam dentro do Expo Go (limitação do Android desde o SDK 53), mas funcionam normalmente no APK instalado.
>
> No Windows, o Gradle **não compila em caminho com acento**: faça o build numa cópia em um caminho só com ASCII.

---

## 🗺️ Próximos passos

- Sincronização entre aparelhos (o modelo de dados já está preparado)
- Integração bancária, via Open Finance ou importação de OFX

---

<div align="center">

Feito com 💚 por **Otávio Felix Da Silva**.

Todos os direitos reservados © Otávio Felix Da Silva. Este código é disponibilizado publicamente para visualização e portfólio, mas seu uso, cópia, modificação ou redistribuição não são autorizados sem permissão expressa do autor.

</div>
