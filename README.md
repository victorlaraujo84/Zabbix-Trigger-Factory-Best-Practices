# Zabbix Trigger Factory & Best Practices

Ferramenta para elaborar, validar e documentar triggers de monitoramento Zabbix.

## Funcionalidades

- Catálogo de boas práticas organizado por categoria de monitoramento.
- Geração de expressões, simulação de sintaxe e validação de requisitos.
- Inventário de hosts, auditoria de triggers e painel de conformidade.

## Executar localmente

Node.js e npm.

Para usar autenticação Google e persistência em Firestore em um ambiente próprio, ajuste `firebase-applet-config.json` e confira as [regras do Firestore](firestore.rules).

Na raiz do projeto, execute:

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite. Selecione uma categoria no catálogo ou abra a fábrica de triggers para montar uma expressão e revisá-la no simulador.

## Comandos

- `npm run lint` — Verifica os tipos do TypeScript.
- `npm run build` — Gera a versão de distribuição.
- `npm run preview` — Pré-visualiza o build do Vite.

## Arquivos de referência

- [Categorias de monitoramento](src/data/categories.ts)
- [Gerador de triggers](src/utils/triggerGenerator.ts)
- [Simulador de sintaxe](src/utils/syntaxEvaluator.ts)
