<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AccountBand extends JsonSerializableType
{
    /**
     * @var int $monthly
     */
    #[JsonProperty('monthly')]
    public int $monthly;

    /**
     * @var ?int $upTo
     */
    #[JsonProperty('upTo')]
    public ?int $upTo;

    /**
     * @param array{
     *   monthly: int,
     *   upTo?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->monthly = $values['monthly'];
        $this->upTo = $values['upTo'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
