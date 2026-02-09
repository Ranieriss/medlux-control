# medlux-control

Sistema de gerenciamento de equipamentos MEDLUX (controle, calibração, cautela e rastreabilidade).

## Como usar

1. Acesse a landing page:
   - `https://ranieriss.github.io/medlux-control/front-end/index.html`
2. Clique em **MEDLUX Control** para abrir o módulo principal.
3. O módulo funciona offline-first e salva os registros no navegador via IndexedDB.

## Dashboard

- Os status respeitam o valor salvo, mas vencimentos de calibração vencidos viram **VENCIDO** automaticamente.
- A lista **Vencendo em até 30 dias** ajuda a priorizar calibrações.

## Backup / Importação

- **Exportar:** na aba **Auditoria & Backup**, clique em **Exportar JSON** para baixar um arquivo com versão + timestamp.
- **Importar JSON:** selecione um arquivo JSON e escolha **Mesclar** (merge por ID) ou **Substituir tudo**.
- **Importação em lote (colar):** cole conteúdo do Excel (TSV) ou CSV com cabeçalhos padrão na área indicada.
- **Importar CSV:** use um CSV simples com cabeçalhos similares ao padrão da planilha (exemplo em `front-end/medlux-control/seed.csv`).
- **Resetar dados locais:** remove todo o conteúdo salvo no IndexedDB.

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
