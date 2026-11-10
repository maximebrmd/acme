<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class DuplicatePostEncoded extends JsonSerializableType
{
    /**
     * @var array<DuplicateOnChannel> $duplicates
     */
    #[JsonProperty('duplicates'), ArrayType([DuplicateOnChannel::class])]
    public array $duplicates;

    /**
     * @param array{
     *   duplicates: array<DuplicateOnChannel>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->duplicates = $values['duplicates'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
