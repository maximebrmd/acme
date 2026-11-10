<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AdMoney extends JsonSerializableType
{
    /**
     * @var int $amount An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('amount')]
    public int $amount;

    /**
     * @var string $currency An ISO 4217 currency code, in capitals: `EUR`, `USD`.
     */
    #[JsonProperty('currency')]
    public string $currency;

    /**
     * @param array{
     *   amount: int,
     *   currency: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->amount = $values['amount'];
        $this->currency = $values['currency'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
