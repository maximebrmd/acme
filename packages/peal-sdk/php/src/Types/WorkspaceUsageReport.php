<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class WorkspaceUsageReport extends JsonSerializableType
{
    /**
     * @var ?PlanAllowances $allowances
     */
    #[JsonProperty('allowances')]
    public ?PlanAllowances $allowances;

    /**
     * @var Usage $current
     */
    #[JsonProperty('current')]
    public Usage $current;

    /**
     * @var array<UsageDay> $days
     */
    #[JsonProperty('days'), ArrayType([UsageDay::class])]
    public array $days;

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
     * @var ?UsageSharing $sharedWith
     */
    #[JsonProperty('sharedWith')]
    public ?UsageSharing $sharedWith;

    /**
     * @var UsageTotals $totals
     */
    #[JsonProperty('totals')]
    public UsageTotals $totals;

    /**
     * @param array{
     *   current: Usage,
     *   days: array<UsageDay>,
     *   period: UsagePeriod,
     *   totals: UsageTotals,
     *   allowances?: ?PlanAllowances,
     *   plan?: ?value-of<Plan>,
     *   sharedWith?: ?UsageSharing,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->allowances = $values['allowances'] ?? null;
        $this->current = $values['current'];
        $this->days = $values['days'];
        $this->period = $values['period'];
        $this->plan = $values['plan'] ?? null;
        $this->sharedWith = $values['sharedWith'] ?? null;
        $this->totals = $values['totals'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
