<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class BillingSubscription extends JsonSerializableType
{
    /**
     * @var bool $cancelAtPeriodEnd
     */
    #[JsonProperty('cancelAtPeriodEnd')]
    public bool $cancelAtPeriodEnd;

    /**
     * @var ?string $currentPeriodEnd
     */
    #[JsonProperty('currentPeriodEnd')]
    public ?string $currentPeriodEnd;

    /**
     * @var ?string $endsAt
     */
    #[JsonProperty('endsAt')]
    public ?string $endsAt;

    /**
     * @var value-of<BillingInterval> $interval
     */
    #[JsonProperty('interval')]
    public string $interval;

    /**
     * @var value-of<PaidPlan> $plan
     */
    #[JsonProperty('plan')]
    public string $plan;

    /**
     * @var ?string $startedAt
     */
    #[JsonProperty('startedAt')]
    public ?string $startedAt;

    /**
     * @var value-of<SubscriptionStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var ?string $trialEnd
     */
    #[JsonProperty('trialEnd')]
    public ?string $trialEnd;

    /**
     * @param array{
     *   cancelAtPeriodEnd: bool,
     *   interval: value-of<BillingInterval>,
     *   plan: value-of<PaidPlan>,
     *   status: value-of<SubscriptionStatus>,
     *   currentPeriodEnd?: ?string,
     *   endsAt?: ?string,
     *   startedAt?: ?string,
     *   trialEnd?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->cancelAtPeriodEnd = $values['cancelAtPeriodEnd'];
        $this->currentPeriodEnd = $values['currentPeriodEnd'] ?? null;
        $this->endsAt = $values['endsAt'] ?? null;
        $this->interval = $values['interval'];
        $this->plan = $values['plan'];
        $this->startedAt = $values['startedAt'] ?? null;
        $this->status = $values['status'];
        $this->trialEnd = $values['trialEnd'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
