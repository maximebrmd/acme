<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventSubscriptionRenewing extends JsonSerializableType
{
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
     * @var string $renewsAt
     */
    #[JsonProperty('renewsAt')]
    public string $renewsAt;

    /**
     * @param array{
     *   plan: value-of<PaidPlan>,
     *   price: Money,
     *   renewsAt: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->plan = $values['plan'];
        $this->price = $values['price'];
        $this->renewsAt = $values['renewsAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
