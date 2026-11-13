<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class Billing extends JsonSerializableType
{
    /**
     * @var ?BillingAccount $account
     */
    #[JsonProperty('account')]
    public ?BillingAccount $account;

    /**
     * @var PlanAllowances $allowances
     */
    #[JsonProperty('allowances')]
    public PlanAllowances $allowances;

    /**
     * @var string $currency
     */
    #[JsonProperty('currency')]
    public string $currency;

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
     * @var ?TrialOffer $trial
     */
    #[JsonProperty('trial')]
    public ?TrialOffer $trial;

    /**
     * @var Usage $usage
     */
    #[JsonProperty('usage')]
    public Usage $usage;

    /**
     * @var int $vatRate
     */
    #[JsonProperty('vatRate')]
    public int $vatRate;

    /**
     * @var ?string $withdrawableUntil
     */
    #[JsonProperty('withdrawableUntil')]
    public ?string $withdrawableUntil;

    /**
     * @param array{
     *   allowances: PlanAllowances,
     *   currency: string,
     *   enabled: bool,
     *   plans: array<PlanOffer>,
     *   usage: Usage,
     *   vatRate: int,
     *   account?: ?BillingAccount,
     *   plan?: ?value-of<Plan>,
     *   subscription?: ?BillingSubscription,
     *   trial?: ?TrialOffer,
     *   withdrawableUntil?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->account = $values['account'] ?? null;
        $this->allowances = $values['allowances'];
        $this->currency = $values['currency'];
        $this->enabled = $values['enabled'];
        $this->plan = $values['plan'] ?? null;
        $this->plans = $values['plans'];
        $this->subscription = $values['subscription'] ?? null;
        $this->trial = $values['trial'] ?? null;
        $this->usage = $values['usage'];
        $this->vatRate = $values['vatRate'];
        $this->withdrawableUntil = $values['withdrawableUntil'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
