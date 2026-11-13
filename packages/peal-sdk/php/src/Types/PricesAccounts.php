<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PricesAccounts extends JsonSerializableType
{
    /**
     * @var array<AccountBand> $bands
     */
    #[JsonProperty('bands'), ArrayType([AccountBand::class])]
    public array $bands;

    /**
     * @param array{
     *   bands: array<AccountBand>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->bands = $values['bands'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
