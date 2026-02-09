# medlux-control

Sistema offline-first para gestão de equipamentos MEDLUX, usuários, vínculos (cautelas) e medições técnicas.

## Como usar

1. Acesse a landing page:
   - `https://ranieriss.github.io/medlux-control/front-end/index.html`
2. Clique em **MEDLUX Control** para o módulo de gestão.
3. Clique em **MEDLUX Reflective Control** para registrar medições.
4. O módulo funciona offline-first e salva os registros no navegador via IndexedDB.
   - As bibliotecas de Excel/PDF são carregadas via CDN na primeira execução e ficam cacheadas em seguida.

## Autenticação local (offline)

- Login por **ID + PIN**.
- PIN armazenado via **PBKDF2 + SHA-256 (100000 iterações + salt)**.
- Primeiro acesso:
  - **Usuário:** `ADMIN`
  - **PIN:** `1234`

## Equipamentos

- Funções: **Horizontal**, **Vertical**, **Tachas**.
- Geometria obrigatória apenas para equipamentos **Horizontal** (15m ou 30m).
- Status suportados: **Obra**, **Lab Tintas**, **Demonstração**, **Vendido**, **Stand-by**.

## Vínculos / Cautelas

- Apenas equipamentos com vínculo ativo ficam disponíveis no **Reflective Control**.
- Ao criar vínculo, o status do equipamento é atualizado para **Obra**.
- Encerrar vínculo retorna o equipamento para **Stand-by**.

## Medições (Reflective Control)

- Operadores só podem registrar medições quando possuem vínculo ativo com o equipamento.
- Cada medição registra auditoria automática (usuário + timestamp).

## Backup / Importação

- **Exportar:** na aba **Auditoria & Backup**, clique em **Exportar JSON**.
- **Importar JSON:** selecione um arquivo JSON e escolha **Mesclar** ou **Substituir tudo**.
- **Importar Excel (.xlsx):**
  - Selecione um arquivo `.xlsx` e clique em **Pré-visualizar Excel**.
  - Em seguida, escolha **Mesclar** ou **Substituir tudo** e clique em **Importar Excel (.xlsx)**.
  - Colunas aceitas (tolerante a variações):
    - Identificação, Função, Geometria, Modelo, Nº de série, Data de aquisição, Calibrado, Nº Certificado,
      Fabricante, Usuário responsável, Localidade, Data entrega usuário, Status.
- **Importação em lote (colar):** cole conteúdo do Excel (TSV) ou CSV com cabeçalhos padrão.
- **Importar CSV:** use um CSV simples com cabeçalhos similares ao padrão da planilha (exemplo em `front-end/medlux-control/seed.csv`).
- **Resetar dados locais:** remove todo o conteúdo salvo no IndexedDB.

## Auditoria em PDF

- Na aba **Auditoria & Backup**, clique em **Gerar PDF de Auditoria**.
- O PDF inclui:
  - Lista completa de equipamentos.
  - Histórico de vínculos.
  - Histórico de medições.
  - Auditor (ADMIN) e data/hora de geração.

## Instalar como PWA

1. Abra `front-end/medlux-control/index.html` em um navegador compatível.
2. Use a opção **Instalar aplicativo** do navegador (menu ou ícone na barra de endereços).
3. O app ficará disponível offline com os assets essenciais em cache.

## Checklist de testes

- [ ] Login como ADMIN e criar um novo usuário OPERADOR.
- [ ] Cadastrar equipamento Horizontal com geometria obrigatória.
- [ ] Criar vínculo e confirmar que o equipamento ficou disponível no Reflective Control.
- [ ] Registrar medição no Reflective Control com operador vinculado.
- [ ] Gerar PDF de auditoria e validar se equipamentos, vínculos e medições aparecem.
- [ ] Exportar/Importar JSON e validar persistência.
- [ ] Importar Excel/CSV e revisar pré-visualização.
