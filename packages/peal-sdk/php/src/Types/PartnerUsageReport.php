<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PartnerUsageReport extends JsonSerializableType
{
    /**
     * @var ?PlanAllowances $allowances
     */
    #[JsonProperty('allowances')]
    public ?PlanAllowances $allowances;

    /**
     * @var ?PartnerHoldings $current
     */
    #[JsonProperty('current')]
    public ?PartnerHoldings $current;

    /**
     * @var ?array<PartnerUsageReportDay> $days
     */
    #[JsonProperty('days'), ArrayType([PartnerUsageReportDay::class])]
    public ?array $days;

    /**
     * @var UsagePeriod $period
     */
    #[JsonProperty('period')]
    public UsagePeriod $period;

    /**
     * @var ?value-of<Plan> $plan
     */
    #[JsonProperty('plan')]
    public ?string $plan;

    /**
     * @var ?UsageTotals $totals
     */
    #[JsonProperty('totals')]
    public ?UsageTotals $totals;

    /**
     * @var TenantUsagePage $workspaces
     */
    #[JsonProperty('workspaces')]
    public TenantUsagePage $workspaces;

    /**
     * @param array{
     *   period: UsagePeriod,
     *   workspaces: TenantUsagePage,
     *   allowances?: ?PlanAllowances,
     *   current?: ?PartnerHoldings,
     *   days?: ?array<PartnerUsageReportDay>,
     *   plan?: ?value-of<Plan>,
     *   totals?: ?UsageTotals,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->allowances = $values['allowances'] ?? null;
        $this->current = $values['current'] ?? null;
        $this->days = $values['days'] ?? null;
        $this->period = $values['period'];
        $this->plan = $values['plan'] ?? null;
        $this->totals = $values['totals'] ?? null;
        $this->workspaces = $values['workspaces'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
