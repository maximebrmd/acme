<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

/**
 * A boost's budget in the ad account's minor units: `total` for its whole run, or `daily` for each day of it.
 */
class BoostBudget extends JsonSerializableType
{
    /**
     * @var int $amount An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('amount')]
    public int $amount;

    /**
     * @var value-of<BoostBudgetKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @param array{
     *   amount: int,
     *   kind: value-of<BoostBudgetKind>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->amount = $values['amount'];
        $this->kind = $values['kind'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
