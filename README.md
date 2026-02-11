# medlux-control

Sistema offline-first para gestão de equipamentos MEDLUX, usuários, vínculos (cautelas) e medições técnicas.

## Como usar

1. Acesse a landing page:
   - `https://ranieriss.github.io/medlux-control/front-end/index.html`
2. Clique em **MEDLUX Control** para o módulo de gestão (**somente ADMIN**).
3. Clique em **MEDLUX Reflective Control** para registrar medições (**USER ou ADMIN**).
4. O módulo funciona offline-first e salva os registros no navegador via IndexedDB.
   - As bibliotecas de Excel/PDF são carregadas via CDN na primeira execução e ficam cacheadas em seguida.

## Autenticação local (offline)

- Login por **ID + PIN**.
- PIN armazenado via **PBKDF2 + SHA-256 (100000 iterações + salt)**.
- Primeiro acesso (ADMIN padrão):
  - **Usuário:** `ADMIN`
  - **PIN:** `2308`
  - Após o login, o ADMIN pode criar operadores e vínculos ativos.

### Criar operador e vínculo

1. No **MEDLUX Control**, abra a aba **Usuários** e clique em **Novo usuário**.
2. Informe o ID, nome, perfil **USER** e PIN.
3. Na aba **Vínculos**, selecione o equipamento e o operador, defina a data de início e salve.
4. Cadastre a **Obra** na aba **Obras** para liberar a referência nas medições.

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
- Cada medição registra **subtipo**, **localização (GPS/endereço)**, **fotos** e **identificador do relatório**.
- Regras de média:
  - **Horizontal**: 10 leituras por estação, descarta maior e menor e calcula média das 8 restantes.
  - **Vertical/Tachas**: média simples.
  - **Legenda**: 3 leituras por letra (média por letra).
  - **Placas**: 5 leituras por cor e ângulo (0°/90°), média simples.
- ADMIN pode registrar medições para qualquer equipamento e visualizar todas.
  - Se não houver login ativo, o app solicita o login local antes de liberar o formulário.


## Regras de conformidade (PDF e relatórios)

- O valor principal exibido em PDF/exportações é sempre a **MÉDIA** calculada.
- **Horizontal**: descarta maior e menor leitura e calcula a média das restantes (mantendo `raw_readings`, `discarded_min`, `discarded_max`).
- **Vertical**: média simples; tipo de película dinâmico **I–X**.
- **Tachas**: média simples; tipo de lente refletiva dinâmico **I–IV** (NBR ABNT 14636).
- **% de conformidade** = `conformes / (conformes + não conformes) * 100`; medições **NÃO AVALIADAS** ficam fora do denominador e aparecem separadamente.
- **LEGENDA**: estrutura recomendada de **3 leituras por letra**, com tabela de média por letra e média final da legenda.

## Relatórios em PDF

- **MEDLUX Control (ADMIN)**:
  - **Relatório Global**: inclui equipamentos, vínculos e medições com médias calculadas, coordenadas e anexos.
  - **Relatório por Obra**: capa com identificador, dados da obra, período, resumo estatístico e fotos.
- **MEDLUX Reflective Control (USER)**:
  - **Relatório Individual** apenas das próprias medições (por obra/período).

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
- **Importar CSV:** use CSV RFC 4180 (vírgula e escape com aspas) com cabeçalhos padrão (exemplo em `front-end/medlux-control/seed.csv`).
- **Resetar dados locais:** remove todo o conteúdo salvo no IndexedDB.

## Instalar como PWA

1. Abra `front-end/medlux-control/index.html` em um navegador compatível.
2. Use a opção **Instalar aplicativo** do navegador (menu ou ícone na barra de endereços).
3. O app ficará disponível offline com os assets essenciais em cache.

## Checklist de testes (10 minutos)

- [ ] Login ADMIN no **MEDLUX Control**.
- [ ] Criar usuário (USER/OPERADOR) com PIN.
- [ ] Cadastrar equipamento (com função e status).
- [ ] Criar vínculo ativo entre usuário e equipamento.
- [ ] Registrar medição simples no **Reflective** (com leituras válidas).
- [ ] Gerar PDF (global ou por obra).
- [ ] Exportar JSON e importar em **Mesclar** (validar prévia).
- [ ] Exportar JSON e importar em **Substituir tudo**.
- [ ] Verificar auditoria sem duplicatas após operações.
- [ ] Abrir “Diagnóstico” (ADMIN) e exportar JSON de diagnóstico.


## Teste manual guiado — Novo vínculo (Vínculos/Cautelas)
1. Acesse `front-end/medlux-control/index.html` e faça login como **ADMIN**.
2. Abra a aba **Vínculos / Cautelas** e clique em **Novo vínculo**.
3. Confirme que o modal abre com os campos: Equipamento, Usuário, Data início, Observações e Termo PDF opcional.
4. Selecione um equipamento e um usuário ativos, preencha a data de início e salve.
5. Valide que o vínculo aparece na tabela imediatamente (sem F5) e que o dashboard/listas refletem a atualização.
6. Opcional: repita com anexo PDF de termo e abra o documento pelo link **Ver** na linha do vínculo.
