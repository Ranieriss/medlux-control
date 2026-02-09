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

### Procedimentos de login (ADMIN e OPERADOR)

- **ADMIN**: use o ID `ADMIN` e PIN inicial `2308` (altere depois em **Usuários**).
- **OPERADOR/USER**: deve ser cadastrado pelo ADMIN com PIN próprio.
- Login é **case-insensitive** para o ID (maiúsculas/minúsculas).

### Criar operador e vínculo

1. No **MEDLUX Control**, abra a aba **Usuários** e clique em **Novo usuário**.
2. Informe o ID, nome, perfil **USER** e PIN.
3. Na aba **Vínculos**, selecione o equipamento e o operador, defina a data de início e salve.
4. Cadastre a **Obra** na aba **Obras** para liberar a referência nas medições.

### Como criar uma medição

1. Acesse o **MEDLUX Reflective Control** e selecione o equipamento vinculado.
2. Informe **Obra**, **Relatório ID**, **tipo/subtipo**, **tipo de marcação**, **Rodovia/KM**, **faixa/sentido** e **endereço completo**.
3. Para **Horizontal**, preencha até **3 estações** (ex: bordo direito, eixo, bordo esquerdo) e registre **10 leituras**.
4. Clique em **Capturar GPS** (se não houver GPS, preencha manualmente).
5. Anexe **Foto da leitura** e **Foto do local**.
6. Salve a medição.

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

## Relatórios em PDF

- **MEDLUX Control (ADMIN)**:
  - **Relatório Global**: capa com ID, período, versão do sistema, seção de equipamentos (calibração), vínculos ativos,
    medições com média/qtde leituras, estatísticas por tipo, mapas e miniaturas de fotos, auditoria consolidada e assinaturas.
  - **Relatório por Obra**: mesma estrutura do global, filtrada por obra, com mapa inicial, estatísticas por trecho e fotos com legendas.
- **MEDLUX Reflective Control (USER)**:
  - **Relatório Individual** apenas das próprias medições (por obra/período), com capa simplificada e anexos.

## Backup / Importação

- **Exportar:** na aba **Auditoria & Backup**, clique em **Exportar JSON**.
- **Importar JSON:** selecione um arquivo JSON e escolha **Mesclar** ou **Substituir tudo**.
- **Importar Excel (.xlsx):**
  - Selecione um arquivo `.xlsx` e clique em **Pré-visualizar Excel**.
  - Em seguida, escolha **Mesclar** ou **Substituir tudo** e clique em **Importar Excel (.xlsx)**.
  - O cabeçalho deve seguir o **schema técnico uniforme**:
    - ID, Função, Geometria, Modelo, Número de série, Data de aquisição, Calibrado, Data de calibração,
      Número do certificado, Fabricante, Usuário responsável, Localidade (Cidade/UF),
      Data entrega usuário, Status, Observações.
- **Importação em lote (colar):** cole conteúdo do Excel (TSV) ou CSV com cabeçalhos padrão.
- **Importar CSV:** use CSV RFC 4180 (vírgula e escape com aspas) com cabeçalhos padrão (exemplo em `front-end/medlux-control/seed.csv`).
- **Resetar dados locais:** remove todo o conteúdo salvo no IndexedDB.

### Seed opcional

- `front-end/medlux-control/seed.csv`: equipamentos de exemplo no schema uniforme.
- `front-end/medlux-control/seed.snapshot.json`: snapshot com **equipamento + vínculo + medição**.
  - Usuário seed: **OP001** (PIN `1234`).
  - Importe via **Exportar/Importar JSON** no MEDLUX Control.

## Instalar como PWA

1. Abra `front-end/medlux-control/index.html` em um navegador compatível.
2. Use a opção **Instalar aplicativo** do navegador (menu ou ícone na barra de endereços).
3. O app ficará disponível offline com os assets essenciais em cache.

## Checklist de testes

- [ ] Criar usuário **USER** e PIN.
- [ ] Cadastrar equipamento horizontal (15m), outro (30m) e um vertical (sem geometria).
- [ ] Criar vínculo ativo do operador com um equipamento.
- [ ] Cadastrar uma **Obra**.
- [ ] Logar como USER no Reflective e salvar medição horizontal com 10 leituras (média com descarte).
- [ ] Capturar GPS e anexar fotos (visor + local).
- [ ] Gerar **Relatório Individual** no Reflective.
- [ ] Logar como ADMIN no Control e gerar **Relatório Global** e **Relatório por Obra**.
- [ ] Exportar CSV e reimportar (round-trip).
