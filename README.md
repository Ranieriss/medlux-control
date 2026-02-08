# medlux-control

Sistema de gerenciamento de equipamentos MEDLUX (controle, calibração, cautela e rastreabilidade).

## Como usar

1. Acesse a landing page:
   - `https://ranieriss.github.io/medlux-control/front-end/index.html`
2. Clique em **MEDLUX Control** para abrir o módulo principal.
3. O módulo funciona offline-first e salva os registros no navegador via IndexedDB.

## Backup / Restore

- **Exportar:** na aba **Auditoria & Backup**, clique em **Exportar JSON** para baixar um arquivo com todos os equipamentos.
- **Importar:** selecione um arquivo JSON e confirme a importação para substituir os dados locais.
- **Resetar dados locais:** remove todo o conteúdo salvo no IndexedDB.

## Instalar como PWA

1. Abra `front-end/medlux-control/index.html` em um navegador compatível.
2. Use a opção **Instalar aplicativo** do navegador (menu ou ícone na barra de endereços).
3. O app ficará disponível offline com os assets essenciais em cache.
