<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class Billing extends JsonSerializableType
{
    /**
     * @var PlanAllowances $allowances
     */
    #[JsonProperty('allowances')]
    public PlanAllowances $allowances;

    /**
     * @var bool $enabled
     */
    #[JsonProperty('enabled')]
    public bool $enabled;

    /**
     * @var ?value-of<Plan> $plan
     */
    #[JsonProperty('plan')]
    public ?string $plan;

    /**
     * @var array<PlanOffer> $plans
     */
    #[JsonProperty('plans'), ArrayType([PlanOffer::class])]
    public array $plans;

    /**
     * @var ?BillingSubscription $subscription
     */
    #[JsonProperty('subscription')]
    public ?BillingSubscription $subscription;

    /**
     * @var Usage $usage
     */
    #[JsonProperty('usage')]
    public Usage $usage;

    /**
     * @param array{
     *   allowances: PlanAllowances,
     *   enabled: bool,
     *   plans: array<PlanOffer>,
     *   usage: Usage,
     *   plan?: ?value-of<Plan>,
     *   subscription?: ?BillingSubscription,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->allowances = $values['allowances'];
        $this->enabled = $values['enabled'];
        $this->plan = $values['plan'] ?? null;
        $this->plans = $values['plans'];
        $this->subscription = $values['subscription'] ?? null;
        $this->usage = $values['usage'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
