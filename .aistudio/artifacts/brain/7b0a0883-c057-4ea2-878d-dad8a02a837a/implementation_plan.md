# Plano de Implementação: Painel de Conformidade (Compliance Dashboard) com Recharts & Exportador XLSX em 4 Abas

Criar um **Painel de Conformidade** analítico e interativo para visualizar a proporção entre **Triggers Ativas/Configuradas** e as **Recomendações Homologadas de Melhores Práticas** em todas as categorias de monitoramento (Virtualização, Bancos de Dados, Rede, Servidores, Aplicações e Nuvem), destacando lacunas de cobertura (*coverage gaps*). Além disso, disponibilizar a exportação do ambiente consolidado em uma planilha **XLSX formatada em 4 abas** (Resumo Executivo, Triggers Homologadas, Inventário de Hosts e Auditoria de Gaps).

---

## 1. Pacotes & Dependências
- Instalar `recharts` para renderização responsiva dos gráficos analíticos (`BarChart`, `RadarChart`, `ResponsiveContainer`, `Tooltip`, `Legend`).
- Utilizar a biblioteca `xlsx` já integrada para a geração nativa da pasta de trabalho multi-aba.

---

## 2. Motor de Análise de Cobertura & Exportador Multi-Aba (`src/utils/complianceAnalytics.ts` e `src/utils/multiTabExport.ts`)

### A. Métricas de Cobertura por Categoria
Calcular para cada uma das categorias de monitoramento (`docker_container`, `vmware`, `mssql`, `mysql`, `firewall`, `network_switch`, etc.):
- **Práticas Recomendadas no Catálogo**: Quantidade total de regras homologadas no catálogo oficial Zabbix para aquela tecnologia.
- **Triggers Ativas no Parque**: Quantidade de triggers atualmente configuradas/associadas aos hosts cadastrados do cliente.
- **Lacuna de Cobertura (Gap)**: Quantidade de métricas essenciais que ainda não possuem trigger configurada.
- **Percentual de Cobertura (% Compliance)**: Taxa de aderência de 0% a 100%.

### B. Exportador XLSX em 4 Abas Formatadas (`exportComprehensiveEnvironmentExcel`)
Estrutura completa da pasta de trabalho:
1. **Aba 1: Resumo Executivo**:
   - Cabeçalhos formatados, dados do cliente ativo, quantidade total de ativos, total de triggers, pontuação global de conformidade e tabela de indicadores de saúde.
2. **Aba 2: Triggers Homologadas**:
   - Relação detalhada de todas as triggers geradas: `Host`, `Categoria`, `Nome da Trigger`, `Expressão Zabbix 6.0/7.0`, `Expressão de Recuperação`, `Severidade`, `Macros de Limite`, `Tags Zabbix` e `Procedimento Operacional`.
3. **Aba 3: Inventário de Hosts**:
   - Dados de cada ativo: `Hostname`, `Tipo de Ativo`, `IP / DNS`, `Porta`, `Status do Agente`, `Triggers Associadas`, `Percentual de Cobertura`.
4. **Aba 4: Auditoria & Gaps de Cobertura**:
   - Diagnóstico categoria por categoria indicando as práticas ausentes, riscos de observabilidade associados e plano de ação recomendado.
- Auto-ajuste de largura de colunas (`!cols`) em todas as 4 abas para visualização profissional direta no Microsoft Excel.

---

## 3. Componente "Painel de Conformidade" (`src/components/ComplianceDashboardView.tsx`)

Layout alinhado com `frontend-design` e diretrizes de dashboards analíticos (`references/3_saas_dashboard.md`):
- **Barra de Controle Superior**:
  - Título, descrição executiva e botão destacado: **"Exportar Inventário & Conformidade (XLSX 4 Abas)"**.
  - Seletor de visualização (Visão Geral de Todas as Categorias ou Filtrar por Categoria Específica).
- **Cards de Métricas Chave (KPIs)**:
  - % Cobertura Média Global (com cor semântica: verde $\ge 80\%$, âmbar $50-79\%$, vermelho $<50\%$).
  - Categorias Totalmente Cobertas vs Categorias com Gaps Críticos.
  - Total de Práticas Homologadas vs Ativas no Parque.
- **Visualizações Recharts**:
  - **Gráfico 1: Barras Comparativo (Ativas vs Recomendadas por Categoria)**:
    - Eixo X com nomes amigáveis das categorias.
    - Barras duplas com contraste: Rose (`Triggers Ativas`) e Slate/Indigo (`Total Recomendado`).
    - Tooltip customizado em modo escuro com valores absolutos e percentual de cobertura.
  - **Gráfico 2: Radar de Equilíbrio de Cobertura Global**:
    - `RadarChart` multidimensional evidenciando visualmente quais áreas da infraestrutura estão bem cobertas (ex: SO e Rede) versus áreas descobertas (ex: Banco de Dados ou Containers).
- **Tabela de Ação Imediata (Gaps de Cobertura Identificados)**:
  - Lista de itens não cobertos com severidade recomendada e botão de ação direta: **"Gerar na Fábrica de Triggers"** (leva o usuário direto para a Fábrica com o host e prática pré-selecionados para fechar o gap).

---

## 4. Navegação & Roteamento

1. **`src/components/Navbar.tsx`**:
   - Adicionar `'compliance'` ao tipo `ActiveTab`.
   - Adicionar item de navegação com ícone `BarChart3` ou `PieChart` e rótulo **"Painel de Conformidade"**.
2. **`src/App.tsx`**:
   - Renderizar `ComplianceDashboardView` quando `activeTab === 'compliance'`.
   - Conectar atalhos para direcionar o usuário à Fábrica de Triggers quando desejar suprir uma lacuna.

---

## 5. Plano de Verificação e Testes

1. **Validação do Cálculo de Métricas**:
   - Verificar se as categorias (Docker, VMware, MSSQL, MySQL, Switches, etc.) calculam corretamente a proporção entre catálogo e hosts existentes.
2. **Renderização dos Gráficos Recharts**:
   - Confirmar renderização responsiva do `BarChart` e `RadarChart` sem overflow e com tooltips legíveis.
3. **Teste da Exportação XLSX**:
   - Clicar em "Exportar Inventário & Conformidade (XLSX 4 Abas)" e verificar a abertura do arquivo com as 4 planilhas nomeadas e preenchidas.
4. **Verificação de Build & Lint**:
   - Executar `lint_applet` e `compile_applet` garantindo integridade estrita de tipagem e 0 erros.
