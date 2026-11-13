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
     * @var BillingAccountsUsage $accounts
     */
    #[JsonProperty('accounts')]
    public BillingAccountsUsage $accounts;

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
     * @var ?Money $estimate
     */
    #[JsonProperty('estimate')]
    public ?Money $estimate;

    /**
     * @var ?bool $paymentFailed
     */
    #[JsonProperty('paymentFailed')]
    public ?bool $paymentFailed;

    /**
     * @var bool $paymentMethod
     */
    #[JsonProperty('paymentMethod')]
    public bool $paymentMethod;

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
     * @var ?RateCard $rateCard
     */
    #[JsonProperty('rateCard')]
    public ?RateCard $rateCard;

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
     * @var ?Money $upcomingInvoice
     */
    #[JsonProperty('upcomingInvoice')]
    public ?Money $upcomingInvoice;

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
     *   accounts: BillingAccountsUsage,
     *   allowances: PlanAllowances,
     *   currency: string,
     *   enabled: bool,
     *   paymentMethod: bool,
     *   plans: array<PlanOffer>,
     *   usage: Usage,
     *   vatRate: int,
     *   account?: ?BillingAccount,
     *   estimate?: ?Money,
     *   paymentFailed?: ?bool,
     *   plan?: ?value-of<Plan>,
     *   rateCard?: ?RateCard,
     *   subscription?: ?BillingSubscription,
     *   trial?: ?TrialOffer,
     *   upcomingInvoice?: ?Money,
     *   withdrawableUntil?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->account = $values['account'] ?? null;
        $this->accounts = $values['accounts'];
        $this->allowances = $values['allowances'];
        $this->currency = $values['currency'];
        $this->enabled = $values['enabled'];
        $this->estimate = $values['estimate'] ?? null;
        $this->paymentFailed = $values['paymentFailed'] ?? null;
        $this->paymentMethod = $values['paymentMethod'];
        $this->plan = $values['plan'] ?? null;
        $this->plans = $values['plans'];
        $this->rateCard = $values['rateCard'] ?? null;
        $this->subscription = $values['subscription'] ?? null;
        $this->trial = $values['trial'] ?? null;
        $this->upcomingInvoice = $values['upcomingInvoice'] ?? null;
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
