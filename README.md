# medlux-control

Sistema de gerenciamento de equipamentos MEDLUX (controle, calibração, cautela e rastreabilidade).

## Como usar

1. Acesse a landing page:
   - `https://ranieriss.github.io/medlux-control/front-end/index.html`
2. Clique em **MEDLUX Control** para abrir o módulo principal.
3. O módulo funciona offline-first e salva os registros no navegador via IndexedDB.
   - As bibliotecas de Excel/PDF são carregadas via CDN na primeira execução e ficam cacheadas em seguida.

## Dashboard

- Os status respeitam o valor salvo, mas vencimentos de calibração vencidos viram **VENCIDO** automaticamente.
- A lista **Vencendo em até 30 dias** ajuda a priorizar calibrações.

## Backup / Importação

- **Exportar:** na aba **Auditoria & Backup**, clique em **Exportar JSON** para baixar um arquivo com versão + timestamp.
- **Importar JSON:** selecione um arquivo JSON e escolha **Mesclar** (merge por ID) ou **Substituir tudo**.
- **Importar Excel (.xlsx):**
  - Na aba **Auditoria & Backup**, selecione um arquivo `.xlsx` e clique em **Pré-visualizar Excel**.
  - O sistema mostra quantas linhas válidas existem, um preview com as primeiras 5 linhas e avisos de datas inválidas.
  - Em seguida, escolha **Mesclar** (atualiza campos existentes) ou **Substituir tudo** e clique em **Importar Excel (.xlsx)**.
  - Colunas aceitas (tolerante a variações): Identificação, Função/Tipo, 2º Modelo, Nº de série, Data de aquisição, Data de calibração, Fabricante, Local, Nº certificado.
- **Importação em lote (colar):** cole conteúdo do Excel (TSV) ou CSV com cabeçalhos padrão na área indicada.
- **Importar CSV:** use um CSV simples com cabeçalhos similares ao padrão da planilha (exemplo em `front-end/medlux-control/seed.csv`).
- **Resetar dados locais:** remove todo o conteúdo salvo no IndexedDB.

## Auditoria em PDF

- Na aba **Auditoria & Backup**, clique em **Gerar PDF de Auditoria**.
- O PDF inclui cabeçalho, resumo de status e tabela completa multi-página ordenada por vencimento.

## Regras de status (ordem de prioridade)

1. Se a calibração venceu (365 dias) → **VENCIDO**.
2. Caso contrário → mantém o status salvo no cadastro (editável manualmente).

## Exportação CSV (tabela)

- Na aba **Equipamentos**, use **Exportar CSV da tabela** para baixar apenas os itens filtrados/ordenados.
  - Campos: Identificação, Tipo, 2º Modelo, Nº de série, Datas, Dias para vencimento, Status, Responsável, Observações.

## Instalar como PWA

1. Abra `front-end/medlux-control/index.html` em um navegador compatível.
2. Use a opção **Instalar aplicativo** do navegador (menu ou ícone na barra de endereços).
3. O app ficará disponível offline com os assets essenciais em cache.
