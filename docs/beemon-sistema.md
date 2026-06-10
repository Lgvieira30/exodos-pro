# Sistema BeeMôn / Bee2Go — Constituição

> Este sistema NÃO é um dashboard de Meta Ads. É um **dashboard de aquisição de clientes**.
> Meta Ads gera leads · Moskit CRM mede qualidade · **Ganhos** são o resultado final.
> **Sempre priorizar CRM sobre Meta Ads.**

## Funil oficial

```
Meta Ads → Lead → Moskit CRM → Oportunidade → Ganho ou Perdido
```

## Regras dos estágios

- **Lead** — entrada de funil. NÃO é resultado. Nunca usar como principal indicador.
- **Oportunidade** — lead válido no CRM (potencial comercial).
- **Aberto** — em andamento. Nem sucesso nem fracasso.
- **Perdido** — descartado (perda).
- **Ganho** — cliente fechado. **KPI mais importante.** Toda análise converge para ganhos.

## Hierarquia de KPIs (nunca inverter)

1. Ganhos
2. Taxa de Ganho
3. Custo por Cliente
4. Oportunidades
5. Leads
6. Cliques
7. CTR

## Métricas

- **Meta:** investment, clicks, impressions, ctr, leads, cpl
- **CRM:** opportunities, won, open, lost
- **Negócio:** lead_to_opportunity_rate, lead_to_customer_rate, opportunity_to_customer_rate, cost_per_customer, cost_per_opportunity

## Fórmulas

```
lead_to_customer_rate        = won / leads
opportunity_to_customer_rate = won / opportunities
cost_per_customer            = investment / won
cost_per_opportunity         = investment / opportunities
```

## Rankings obrigatórios (sempre por ganhos, nunca só por leads)

- **Campanhas** (campaign): investment, leads, opportunities, won, lost, cost_per_customer → ordenar por `won`, depois `cost_per_customer`.
- **Públicos** (`utm_term`): leads, won, lost, open, cost_per_customer. Ex.: LAL ICP, RMK, Mar Aberto.
- **Criativos** (`utm_content`): leads, won, lost, open, cost_per_customer.

## Comparação semanal

Semana Atual vs Anterior, com variação %: investment, leads, cpl, opportunities, won, lost, lead_to_customer_rate, cost_per_customer.

## Resumo executivo (automático)

- **O que funcionou** — campanhas/públicos/criativos com mais ganhos.
- **O que piorou** — pior desempenho.
- **O que escalar** — mais ganhos + menor custo por cliente.
- **O que pausar** — gasto significativo e nenhum ganho.

## Interpretação (regra de ouro)

```
Criativo A: 50 leads, 1 ganho
Criativo B: 10 leads, 3 ganhos
→ B é melhor. SEMPRE.
```

Privilegiar **qualidade** de lead, não volume.

## Regra final

A BeeMôn é **CRM-driven**. Meta gera volume · Moskit mede qualidade · **Ganhos determinam sucesso.**
