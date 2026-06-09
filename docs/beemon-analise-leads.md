# BeeMôn — Especificação de Análise (Meta Ads + CRM)

> Fonte da verdade para o desenvolvimento do módulo de análise da BeeMôn.
> Princípio central: **a análise não termina no Meta**. O CRM é a fonte da verdade.
> Lead barato ≠ lead bom. O que determina qualidade é o comportamento do lead no CRM.

## Funil

```
Meta Ads → Landing Page (Bee2Go) → Lead → CRM → Oportunidade → Ganho
```

- **Etapa 1 — Meta Ads:** anúncios em Instagram Feed/Reels e Facebook Feed/Reels. Usuário clica.
- **Etapa 2 — Landing Page:** URL principal `bee2go.com.br` (Gestão de Multas). Ao preencher o formulário, conta-se 1 **LEAD**.
- **Etapa 3 — CRM:** todo lead da LP entra no CRM com:
  - Nome da empresa, Quantidade de veículos, Estado
  - UTM Source, UTM Campaign, UTM Term, UTM Content, Página de origem
  - Esses campos permitem identificar **qual campanha / conjunto / criativo** gerou o lead.

## Status do CRM (qualidade do lead)

- **Ganhou** — lead virou cliente. **Resultado mais importante.** Receita real.
- **Aberto** — em negociação. Pode virar cliente.
- **Perdido** — descartado. Motivos: sem fit, sem frota, sem interesse, concorrente, contato inválido.

## Como analisar qualidade

Sempre cruzar **Meta Ads + CRM**. Exemplo:

| | Leads | CPL | Ganhos CRM |
|---|---|---|---|
| Campanha A | 50 | R$ 20 | 0 |
| Campanha B | 20 | R$ 50 | 5 |

No Meta, a A parece melhor. Cruzando com CRM, a **B é superior** (gera clientes).

## O que analisar

### Campanhas
Leads, CPL, Cliques, CTR, Investimento. **Ranking semanal** (1º/2º/3º).

### Conjuntos (públicos)
Público, Leads, CPL, **Ganhos CRM**. Ex.: LAL ICP, LAL Base Clientes, Remarketing, Mar Aberto.
Objetivo: qual público gera mais oportunidades e ganhos.

### Criativos
Leads, CPL, Cliques, CTR, **Ganhos CRM**. Ex.: "Pagar multa em dobro", "Cliente devolveu o carro", "Condutor irregular".
Foco: **qual criativo gera mais clientes** — não apenas mais leads.

### Comparação Meta × CRM (semanal)
Ex.: Meta 30 leads → CRM 25 oportunidades, 3 ganhos, 22 abertos.
Permite ver: qualidade dos leads, taxa de conversão p/ cliente, eficiência real.

## Relatório semanal — estrutura padrão (8 seções)

1. **Resumo Executivo** — resumo curto da semana.
2. **CRM** — total de oportunidades, ganhos, abertos, perdidos.
3. **Campanhas** — ranking.
4. **Conjuntos** — ranking dos públicos.
5. **Criativos** — ranking dos anúncios.
6. **Comparação Meta × CRM** — leads gerados vs qualidade.
7. **Diagnóstico** — o que funcionou, o que piorou, o que merece mais/menos verba.
8. **Próximos Passos** — plano de ação para a próxima semana.

## Comparação semanal

Trabalha com comparação entre semanas (ex.: 01-07/06, 08-14/06, 15-21/06, 22-30/06).
Sempre comparar: Leads, CPL, Ganhos, Abertos, Perdidos, Campanhas, Públicos, Criativos.
Objetivo: identificar evolução ou queda de desempenho.

## Regra principal

> **Nunca tomar decisão olhando apenas o Meta Ads.**
> Fonte da verdade: **CRM → Ganhos → Qualidade dos Leads**.
> Toda recomendação deve ser baseada no cruzamento **Meta Ads + CRM**.
