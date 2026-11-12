<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class FeedItems extends JsonSerializableType
{
    /**
     * @var array<FeedItem> $items
     */
    #[JsonProperty('items'), ArrayType([FeedItem::class])]
    public array $items;

    /**
     * @param array{
     *   items: array<FeedItem>,
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
