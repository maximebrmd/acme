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
     * @var value-of<PaidPlan> $plan
     */
    #[JsonProperty('plan')]
    public string $plan;

    /**
     * @var value-of<SubscriptionStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @param array{
     *   cancelAtPeriodEnd: bool,
     *   plan: value-of<PaidPlan>,
     *   status: value-of<SubscriptionStatus>,
     *   currentPeriodEnd?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->cancelAtPeriodEnd = $values['cancelAtPeriodEnd'];
        $this->currentPeriodEnd = $values['currentPeriodEnd'] ?? null;
        $this->plan = $values['plan'];
        $this->status = $values['status'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
