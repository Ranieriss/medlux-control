# medlux-control

Sistema de gerenciamento de equipamentos MEDLUX (controle, calibração, cautela e rastreabilidade).

## Como usar

1. Acesse a landing page:
   - `https://ranieriss.github.io/medlux-control/front-end/index.html`
2. Clique em **MEDLUX Control** para abrir o módulo principal.
3. O módulo funciona offline-first e salva os registros no navegador via IndexedDB.

## Dashboard

- Os status são calculados automaticamente com base na situação manual, calibração e responsável atual.
- A lista **Atenção** destaca equipamentos **Vencidos** e **Em cautela**.

## Backup / Importação

- **Exportar:** na aba **Auditoria & Backup**, clique em **Exportar JSON** para baixar um arquivo com todos os equipamentos.
- **Importar JSON:** selecione um arquivo JSON e escolha **Mesclar** (merge por ID) ou **Substituir tudo**.
- **Importar CSV:** use um CSV simples com cabeçalhos similares ao padrão da planilha (exemplo em `front-end/medlux-control/seed.csv`).
- **Resetar dados locais:** remove todo o conteúdo salvo no IndexedDB.

## Regras de status (ordem de prioridade)

1. Situação manual = **EM CALIBRAÇÃO** → Status calculado = **EM CALIBRAÇÃO**.
2. Situação manual = **MANUTENÇÃO** → Status calculado = **MANUTENÇÃO**.
3. Se a última calibração venceu (365 dias) → **VENCIDO**.
4. Se há responsável atual diferente de “Laboratório” → **EM CAUTELA**.
5. Caso contrário → **ATIVO**.

## Instalar como PWA

1. Abra `front-end/medlux-control/index.html` em um navegador compatível.
2. Use a opção **Instalar aplicativo** do navegador (menu ou ícone na barra de endereços).
3. O app ficará disponível offline com os assets essenciais em cache.
