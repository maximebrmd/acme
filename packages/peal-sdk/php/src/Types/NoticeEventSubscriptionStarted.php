<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventSubscriptionStarted extends JsonSerializableType
{
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
     * @var Money $price
     */
    #[JsonProperty('price')]
    public Money $price;

    /**
     * @var string $startedAt
     */
    #[JsonProperty('startedAt')]
    public string $startedAt;

    /**
     * @var ?string $trialEnd
     */
    #[JsonProperty('trialEnd')]
    public ?string $trialEnd;

    /**
     * @param array{
     *   interval: value-of<BillingInterval>,
     *   plan: value-of<PaidPlan>,
     *   price: Money,
     *   startedAt: string,
     *   trialEnd?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->interval = $values['interval'];
        $this->plan = $values['plan'];
        $this->price = $values['price'];
        $this->startedAt = $values['startedAt'];
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
