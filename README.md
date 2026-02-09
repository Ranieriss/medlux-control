# medlux-control

Sistema offline-first para gestão de equipamentos MEDLUX, usuários, vínculos (cautelas) e medições técnicas.

## Como usar

1. Acesse a landing page:
   - `https://ranieriss.github.io/medlux-control/front-end/index.html`
2. Clique em **MEDLUX Control** para o módulo de gestão (**somente ADMIN**).
3. Clique em **MEDLUX Reflective Control** para registrar medições (**OPERADOR ou ADMIN**).
4. O módulo funciona offline-first e salva os registros no navegador via IndexedDB.
   - As bibliotecas de Excel/PDF são carregadas via CDN na primeira execução e ficam cacheadas em seguida.

## Autenticação local (offline)

- Login por **ID + PIN**.
- PIN armazenado via **PBKDF2 + SHA-256 (100000 iterações + salt)**.
- Primeiro acesso (ADMIN padrão):
  - **Usuário:** `ADMIN`
  - **PIN:** `1234`
  - Após o login, o ADMIN pode criar operadores e vínculos ativos.

### Criar operador e vínculo

1. No **MEDLUX Control**, abra a aba **Usuários** e clique em **Novo usuário**.
2. Informe o ID, nome, perfil **OPERADOR** e PIN.
3. Na aba **Vínculos**, selecione o equipamento e o operador, defina a data de início e salve.

## Equipamentos

- Funções: **Horizontal**, **Vertical**, **Tachas**.
- Geometria obrigatória apenas para equipamentos **Horizontal** (15m ou 30m).
- Status suportados: **Obra**, **Lab Tintas**, **Demonstração**, **Vendido**, **Stand-by**.

## Vínculos / Cautelas

- Apenas equipamentos com vínculo ativo ficam disponíveis no **Reflective Control** para operadores.
- Ao criar vínculo, o status do equipamento é atualizado para **Obra**.
- Encerrar vínculo retorna o equipamento para **Stand-by**.

## Medições (Reflective Control)

- Operadores só podem registrar medições quando possuem vínculo ativo com o equipamento.
- Cada medição permite definir a **quantidade de leituras** (padrão 10), registrar cada leitura e salvar a **média** calculada automaticamente.
- ADMIN pode registrar medições para qualquer equipamento e visualizar todas.
  - Se não houver login ativo, o app solicita o login local antes de liberar o formulário.

## Auditoria em PDF

- Na aba **Auditoria & Backup**, clique em **Gerar PDF de Auditoria**.
- O PDF inclui:
  - Lista completa de equipamentos.
  - Histórico de vínculos.
  - Histórico de medições (com **média**, **quantidade de leituras** e leituras compactadas quando necessário).
  - Auditor (ADMIN) e data/hora de geração.

## Backup / Importação

- **Exportar:** na aba **Auditoria & Backup**, clique em **Exportar JSON**.
- **Importar JSON:** selecione um arquivo JSON e escolha **Mesclar** ou **Substituir tudo**.
- **Importar Excel (.xlsx):**
  - Selecione um arquivo `.xlsx` e clique em **Pré-visualizar Excel**.
  - Em seguida, escolha **Mesclar** ou **Substituir tudo** e clique em **Importar Excel (.xlsx)**.
  - Colunas aceitas (tolerante a variações):
    - Identificação, Função, Geometria, Modelo, Nº de série, Data de aquisição, Calibrado, Data de calibração,
      Nº Certificado, Fabricante, Usuário responsável, Localidade (Cidade/UF), Data entrega usuário, Status.
- **Importação em lote (colar):** cole conteúdo do Excel (TSV) ou CSV com cabeçalhos padrão.
- **Importar CSV:** use um CSV simples com cabeçalhos similares ao padrão da planilha (exemplo em `front-end/medlux-control/seed.csv`).
- **Resetar dados locais:** remove todo o conteúdo salvo no IndexedDB.

## Instalar como PWA

1. Abra `front-end/medlux-control/index.html` em um navegador compatível.
2. Use a opção **Instalar aplicativo** do navegador (menu ou ícone na barra de endereços).
3. O app ficará disponível offline com os assets essenciais em cache.

## Checklist de testes

- [ ] Criar operador e PIN.
- [ ] Cadastrar equipamento horizontal (15m), outro (30m) e um vertical (sem geometria).
- [ ] Criar vínculo ativo do operador com um equipamento.
- [ ] Logar como operador no Reflective e salvar medição com 10 leituras (média calculada).
- [ ] Logar como ADMIN no Control e gerar PDF (deve incluir medições do operador com média e quantidade).
