<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class LivePostChanges extends JsonSerializableType
{
    /**
     * @var array<LivePostChange> $items
     */
    #[JsonProperty('items'), ArrayType([LivePostChange::class])]
    public array $items;

    /**
     * @param array{
     *   items: array<LivePostChange>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->items = $values['items'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
