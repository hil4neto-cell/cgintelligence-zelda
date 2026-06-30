# CG Intelligence - Proposta 2 Context

Status: landing estatica independente implementada em 2026-06-30.

Local URL:

`http://127.0.0.1:8898/Clients/CG-Intelligence/Proposals/02-Operational-Atrium/index.html`

## Role Of This Proposal

`02-Operational-Atrium` e a versao mais espacial, modular e agentic das propostas CG Intelligence. Ela nao deve parecer uma variacao da Proposta 1. A pagina deve vender uma infraestrutura viva: camadas, fluxo, sinais, agentes, sistemas e operacao em movimento.

A experiencia principal funciona como um deck modular controlado pelo header:

- `#orchestration`: campo operacional central.
- `#layers`: pilha de camadas vivas.
- `#systems`: Frontier AI Stack como bastidor tecnico.

## Strategic Spine

- Marca principal: CG Intelligence.
- Tese: CG builds agentic growth infrastructure for elite operators.
- Leitura correta: um atrio operacional vivo, nao boardroom, logo wall, agencia de IA generica ou showcase de ferramentas.
- Promessa: transformar demanda, CRM context, analytics, media, production e internal execution em um live field of assigned work.

## Current Implementation

- `index.html`: tres modulos de pagina dentro de um deck: Orchestration, Layers e Systems.
- `styles.css`: sistema visual baseado no Command Center / Strike Team, usando fundo `#0a0a0a`, superficies `#141414` e `#1c1c1c`, bordas `#2a2a2a`, texto `#f2f2f2`, muted `#8a8a8a` e accent branco.
- `script.js`: canvas de particulas/sinais, navegacao modular por hash, transicao entre modulos, protecao contra scroll horizontal e suporte a teclado.
- `assets/operational-atrium-agents.png`: asset visual local usado nos tres modulos.
- `assets/cg-intelligence-logo.svg`: marca atual usada no header e footer.
- `QA/screenshots` e `QA/review`: prints finais e intermediarios do QA visual.

## Motion And Route Behavior

A troca entre `#orchestration`, `#layers` e `#systems` e parte da assinatura desta proposta. Evitar corte seco ao mudar de rota/hash. A transicao atual usa fases `exit`, `travel` e `settle`, com timers em `script.js` e estados no `pageDeck`.

Ao alterar rota, header ou layout:

- Preservar hash routing.
- Preservar `aria-current` nos links ativos.
- Preservar altura sincronizada do deck para evitar jump visual.
- Testar clique no header e acesso direto por hash.
- Testar desktop e mobile porque overflow horizontal foi um ponto sensivel.

## Important Constraints

- Nao usar The Casely Group, TCG ou CC como marca principal.
- Nao usar clientes, cases ou logos externos como prova.
- Nao chamar tecnologias de parceiros.
- `Frontier AI Stack` deve ser camada tecnica discreta, nao endorsement.
- Design system deve seguir o React do Command Center em `/Volumes/Hil Neto - NVME/PROJETOS/Remotion/clients/cg-intelligence/components/StrikeTeam`.
- Nao usar outras cores alem de branco, preto e escalas de cinza escuro, salvo pedido explicito do Hil.
- Evitar boardroom institucional demais, paleta SaaS roxa/azul e visual de template.
- A pagina deve preservar imersao e sensacao de sistema vivo.

## Continuation Notes

- Header e menus podem virar base modular para propostas futuras.
- Se adicionar novo efeito de scroll, ele deve reforcar profundidade e transicao entre camadas, sem prejudicar hash routing.
- Se criar um escritorio 3D ou globo menor em outra proposta, manter esta pagina como referencia de navegacao modular e campo operacional.
- Rodar QA visual em desktop, tablet e mobile antes de considerar pronto.
