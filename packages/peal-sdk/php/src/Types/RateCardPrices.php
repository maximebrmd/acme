<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class RateCardPrices extends JsonSerializableType
{
    /**
     * @var Prices $usd
     */
    #[JsonProperty('usd')]
    public Prices $usd;

    /**
     * @param array{
     *   usd: Prices,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->usd = $values['usd'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
