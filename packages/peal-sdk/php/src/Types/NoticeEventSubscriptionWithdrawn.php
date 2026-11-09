<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventSubscriptionWithdrawn extends JsonSerializableType
{
    /**
     * @var value-of<PaidPlan> $plan
     */
    #[JsonProperty('plan')]
    public string $plan;

    /**
     * @var Money $refunded
     */
    #[JsonProperty('refunded')]
    public Money $refunded;

    /**
     * @var string $withdrawnAt
     */
    #[JsonProperty('withdrawnAt')]
    public string $withdrawnAt;

    /**
     * @param array{
     *   plan: value-of<PaidPlan>,
     *   refunded: Money,
     *   withdrawnAt: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->plan = $values['plan'];
        $this->refunded = $values['refunded'];
        $this->withdrawnAt = $values['withdrawnAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
