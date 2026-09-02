# CTFL Study

Aplicação web responsiva para praticar questões, acompanhar a evolução e organizar a revisão para a certificação ISTQB CTFL. Funciona inteiramente no navegador, sem conta e sem backend, e está pronta para hospedagem gratuita no GitHub Pages.

> Este é um projeto independente de apoio ao estudo. Não é afiliado nem endossado pelo ISTQB. As 24 questões incluídas são autorais e fictícias, servem para demonstrar a aplicação e não reproduzem exames oficiais ou bancos comerciais.

## Funcionalidades

- simulados completos, por assunto, com favoritas ou com questões erradas anteriormente;
- sessões de 10, 20, 30 ou 40 questões, limitadas automaticamente ao conteúdo disponível;
- modo livre e modo prova com cronômetro;
- navegação entre questões, respostas preservadas e marcação para revisar;
- correção detalhada apenas depois da finalização, com explicações;
- histórico, evolução, médias, acurácia por assunto e identificação de pontos fracos;
- priorização de questões menos vistas e, no treino de erros, das dificuldades recorrentes;
- tema claro, escuro ou conforme o sistema;
- persistência local do histórico, configurações, favoritas e simulado em andamento;
- exportação, importação validada e limpeza confirmada dos dados;
- instalação como PWA e suporte offline após o primeiro carregamento completo em produção.

## Requisitos e instalação

- [Node.js](https://nodejs.org/) 20.19 ou mais recente (ou 22.12+);
- npm, incluído com o Node.js.

Clone o repositório e, dentro da pasta do projeto, execute:

```bash
npm install
npm run dev
```

O Vite mostrará o endereço local, normalmente `http://localhost:5173`. Alterações no código e no banco de questões são atualizadas durante o desenvolvimento.

## Scripts disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento. |
| `npm test` | Executa uma vez os testes com Vitest. |
| `npm run test:watch` | Reexecuta os testes durante alterações. |
| `npm run lint` | Verifica o código com ESLint. |
| `npm run build` | Valida o TypeScript e gera a versão estática em `dist/`. |
| `npm run preview` | Serve localmente o último build para conferência. |

Antes de publicar uma alteração, recomenda-se executar:

```bash
npm test
npm run lint
npm run build
```

## Como adicionar perguntas

O banco fica em [`src/data/questions.json`](src/data/questions.json). Ele é um array JSON; para incluir conteúdo, adicione um objeto com o formato abaixo:

```json
{
  "id": 25,
  "question": "Qual resultado representa um objetivo de teste?",
  "options": [
    "Primeira alternativa",
    "Segunda alternativa",
    "Terceira alternativa",
    "Quarta alternativa"
  ],
  "correctAnswer": 1,
  "explanation": "Explique por que a segunda alternativa é a correta.",
  "chapter": "1",
  "topic": "Fundamentos de Teste",
  "difficulty": "medium"
}
```

Regras dos campos:

| Campo | Regra |
| --- | --- |
| `id` | Número inteiro ou texto não vazio, único em todo o arquivo. IDs estáveis mantêm histórico e favoritas relacionados à pergunta certa. |
| `question` | Enunciado não vazio. |
| `options` | Array com pelo menos duas alternativas não vazias. |
| `correctAnswer` | Índice da alternativa correta, começando em **zero**. No exemplo, `1` indica a segunda alternativa. |
| `explanation` | Comentário exibido somente na revisão posterior ao simulado. |
| `chapter` | Identificador textual do capítulo, por exemplo `"1"`. |
| `topic` | Nome usado nos filtros e nas métricas por assunto. |
| `difficulty` | Um dos valores exatos: `easy`, `medium` ou `hard`. |

Depois de editar, execute `npm run build`. O carregamento é validado com Zod: IDs duplicados, alternativas ausentes, índice de resposta fora do intervalo e outros dados inválidos são rejeitados de forma controlada em vez de quebrarem silenciosamente o restante da aplicação.

Os filtros de assunto são derivados do campo `topic`; não é necessário cadastrar a mesma lista em outro arquivo. Ao renomear um tópico, considere que as métricas antigas continuarão identificadas pelo nome salvo no histórico.

## Estrutura principal

```text
src/
├── components/       Componentes reutilizáveis da interface
├── data/             Banco JSON de questões
├── hooks/            Estado e comportamento compartilhado
├── pages/            Dashboard, simulado, resultados e configurações
├── services/         Persistência centralizada no navegador
├── types/            Modelos TypeScript do domínio
├── utils/            Seleção, cálculos e validação testáveis
└── test/             Configuração e testes automatizados
public/
├── icon.svg          Fonte vetorial do ícone da aplicação
├── icon-192.png      Fallback raster para instalação
├── icon-512.png      Ícone raster e versão maskable
├── manifest.webmanifest
└── sw.js             Cache offline com escopo relativo ao deploy
```

## Build e GitHub Pages

Para um site servido na raiz de um domínio, o build comum é suficiente:

```bash
npm run build
npm run preview
```

Para simular um *project site* servido em `https://usuario.github.io/nome-do-repositorio/`, informe o caminho com barras no início e no fim.

PowerShell:

```powershell
$env:VITE_BASE_PATH = "/nome-do-repositorio/"
npm run build
Remove-Item Env:VITE_BASE_PATH
```

Bash:

```bash
VITE_BASE_PATH=/nome-do-repositorio/ npm run build
```

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) automatiza a publicação:

1. publique o repositório no GitHub usando a branch `main`;
2. em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions**;
3. envie um `push` para `main` ou execute manualmente **Deploy to GitHub Pages** na aba Actions;
4. acompanhe os jobs `build` e `deploy`; a URL aparece no ambiente `github-pages` ao final.

A automação instala dependências com `npm ci`, executa os testes, gera o build e publica `dist/`. Ela calcula `VITE_BASE_PATH` a partir do nome do repositório: usa `/` para repositórios `usuario.github.io` e `/nome-do-repositorio/` para os demais. Se a branch principal tiver outro nome, altere `branches` no workflow.

## PWA e uso offline

O manifesto, o ícone e o service worker são incluídos no build. Em produção, após a primeira visita online terminar de carregar, os arquivos essenciais são armazenados no dispositivo. A aplicação pode então ser aberta sem conexão pelo mesmo endereço. O escopo e os caminhos são relativos, portanto também funcionam quando o projeto está em uma subpasta do GitHub Pages.

Para instalar, use **Instalar aplicativo** no navegador compatível ou **Adicionar à Tela de Início** no menu do celular. O service worker não é registrado pelo servidor de desenvolvimento; valide-o com um build de produção, `npm run preview`, `localhost` ou uma origem HTTPS. Após uma nova publicação, abra a aplicação online para receber a versão atualizada antes de depender novamente do modo offline.

## Dados, privacidade e backup

Os dados pessoais de estudo ficam no `localStorage` da origem atual. Nada é enviado a um servidor. Como esse armazenamento pertence à combinação de navegador, dispositivo e endereço, os dados não são sincronizados automaticamente e podem desaparecer se o usuário limpar os dados do site, trocar de navegador ou se o sistema remover o armazenamento.

Em **Configurações → Dados**:

- **Exportar histórico** baixa um JSON com histórico, estatísticas, favoritas, configurações e eventual sessão em andamento;
- **Importar histórico** valida um arquivo nesse formato antes de substituir os dados locais;
- **Limpar todos os dados** pede confirmação antes de apagar histórico, métricas, favoritas, preferências e eventual sessão em andamento.

Faça uma exportação periódica e antes de limpar o navegador ou mudar a URL do projeto. Guarde o arquivo de backup como dado pessoal: ele contém seu histórico detalhado de respostas.

## Versão do syllabus e manutenção do conteúdo

A versão do syllabus é um texto configurável nas preferências e também faz parte do backup. Ela identifica o contexto de estudo, mas não transforma nem valida automaticamente as questões. Ao migrar o conteúdo para outra versão:

1. revise enunciados, terminologia e explicações com fontes autorizadas;
2. atualize o texto da versão nas configurações;
3. mantenha os IDs das questões inalterados quando o significado continuar igual;
4. use novos IDs quando uma alteração mudar substancialmente o que é avaliado;
5. exporte os dados antes de reorganizar tópicos, pois o histórico guarda os nomes usados no momento da tentativa.

O projeto não está amarrado a uma edição específica: capítulos e tópicos vêm do JSON, e a versão é apenas metadado configurável.
