<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class RateCardX extends JsonSerializableType
{
    /**
     * @var int $defaultCeiling
     */
    #[JsonProperty('defaultCeiling')]
    public int $defaultCeiling;

    /**
     * @var RateCardXRates $rates
     */
    #[JsonProperty('rates')]
    public RateCardXRates $rates;

    /**
     * @param array{
     *   defaultCeiling: int,
     *   rates: RateCardXRates,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->defaultCeiling = $values['defaultCeiling'];
        $this->rates = $values['rates'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
