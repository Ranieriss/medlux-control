# medlux-control

Sistema de gerenciamento de equipamentos MEDLUX (controle, calibração, cautela e rastreabilidade).

## Site (GitHub Pages)

https://ranieriss.github.io/medlux-control/

## Como usar

1. Acesse o site e escolha **Medlux Control**.
2. Cadastre os equipamentos.
3. Registre cautelas (saída/retorno), calibrações e acompanhe o dashboard.
4. O sistema funciona offline-first: as alterações são salvas no IndexedDB do navegador.

## Backup e restauração

1. Vá até a aba **Auditoria & Backup**.
2. Clique em **Exportar backup** para baixar um JSON com todos os dados.
3. Para restaurar, use **Importar backup** e selecione o arquivo JSON.
4. O processo de importação substitui os dados atuais.

## Instalação no celular (PWA)

1. Acesse o site no Chrome/Edge.
2. Abra o menu do navegador.
3. Toque em **Adicionar à tela inicial** ou **Instalar aplicativo**.
4. O app ficará disponível como aplicativo independente, inclusive offline.
