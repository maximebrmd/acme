<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class RateCardStorage extends JsonSerializableType
{
    /**
     * @var int $minimum
     */
    #[JsonProperty('minimum')]
    public int $minimum;

    /**
     * @var int $perAccount
     */
    #[JsonProperty('perAccount')]
    public int $perAccount;

    /**
     * @var int $withoutPaymentMethod
     */
    #[JsonProperty('withoutPaymentMethod')]
    public int $withoutPaymentMethod;

    /**
     * @param array{
     *   minimum: int,
     *   perAccount: int,
     *   withoutPaymentMethod: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->minimum = $values['minimum'];
        $this->perAccount = $values['perAccount'];
        $this->withoutPaymentMethod = $values['withoutPaymentMethod'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
