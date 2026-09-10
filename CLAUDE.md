# LinkIA

Página de "link na bio" da Mariana Almeida (@mariiana.ai). Feita no Lovable,
exportada e agora mantida aqui. TanStack Start, React 19, Tailwind 4.

Publicada na Vercel a partir do repositório **público**
`github.com/Plataformia/plata`. Tudo o que entra aqui fica visível a qualquer
pessoa que faça `git clone`.

Não tem base de dados, não tem contas de utilizador, não tem pagamentos e não
tem agentes. O quiz corre todo no navegador e não guarda respostas em lado
nenhum. Se alguma vez isso mudar, o check-up de segurança tem de ser refeito.

## Regras de segurança deste projeto

### Segredos
- Nenhuma chave, token ou palavra-passe escrita no código. Tudo no `.env`.
- O `.env` está no `.gitignore` e nunca sai de lá. O repositório é público,
  por isso uma chave que entre aqui está exposta ao mundo no mesmo minuto.
- Nada de valores secretos em variáveis com prefixo `VITE_` ou `PUBLIC_`.
  Esses prefixos são cozidos dentro do JavaScript que vai para o navegador,
  portanto são públicos por construção.
- Se propuseres uma solução que envolva expor um segredo, para e avisa-me.

### Privacidade dos visitantes
- Nada de terceiros a correr na página sem eu autorizar. Sem Google Fonts
  em tempo de execução, sem analytics, sem pixels, sem tag managers.
- Os tipos de letra estão alojados em `public/fonts` e declarados em
  `src/styles.css`. É de propósito, para o IP de quem visita não sair daqui.
  Se precisares de outro tipo de letra, descarrega o ficheiro e mete-o lá.
- No dia em que houver recolha de dados, tem de haver aviso de privacidade
  antes, não depois.

### A morada do site
- A morada oficial vive numa constante só, em `src/lib/site.ts`.
- Nunca escrevas um endereço à mão no canonical, nas etiquetas de partilha,
  no sitemap ou nos dados estruturados. Importa a constante.
- A única exceção é o `public/robots.txt`, que é estático. Se a morada mudar,
  esse tem de ser mudado à mão.

### Imagens e vídeos
- Os ficheiros vivem dentro do projeto, em `src/assets` ou em `public`.
- Nada de ficheiros `.asset.json` a apontar para o CDN do Lovable. Esses
  caminhos só funcionam dentro do Lovable e dão 404 em qualquer outro sítio.

### Formulários e custos
- Nenhuma rota pública pode chamar um serviço pago sem travão de repetição.
- Qualquer campo que aceite texto ou ficheiros de quem visita tem de ter
  limite de tamanho e validação do lado do servidor, não só no navegador.

### Ações destrutivas
- Avisa-me antes de qualquer comando que apague coisas.
- Não reescrevas o histórico já publicado (sem force push, sem rebase de
  commits que já foram para o GitHub).

### Antes de publicar
- Corre `bun run build` e confirma que passa.
- Corre o check-up de segurança (`/seguranca`) e mostra-me o boletim.
