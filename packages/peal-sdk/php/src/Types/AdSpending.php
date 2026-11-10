<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AdSpending extends JsonSerializableType
{
    /**
     * @var AdAccount $account
     */
    #[JsonProperty('account')]
    public AdAccount $account;

    /**
     * @var int $committedThisMonth An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('committedThisMonth')]
    public int $committedThisMonth;

    /**
     * @param array{
     *   account: AdAccount,
     *   committedThisMonth: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->account = $values['account'];
        $this->committedThisMonth = $values['committedThisMonth'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
