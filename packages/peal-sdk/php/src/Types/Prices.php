<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class Prices extends JsonSerializableType
{
    /**
     * @var PricesAccounts $accounts
     */
    #[JsonProperty('accounts')]
    public PricesAccounts $accounts;

    /**
     * @var PricesMeters $meters
     */
    #[JsonProperty('meters')]
    public PricesMeters $meters;

    /**
     * @param array{
     *   accounts: PricesAccounts,
     *   meters: PricesMeters,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->accounts = $values['accounts'];
        $this->meters = $values['meters'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
