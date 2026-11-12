<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class FeedPreview extends JsonSerializableType
{
    /**
     * @var array<FeedPreviewItem> $items
     */
    #[JsonProperty('items'), ArrayType([FeedPreviewItem::class])]
    public array $items;

    /**
     * @var ?string $title
     */
    #[JsonProperty('title')]
    public ?string $title;

    /**
     * @param array{
     *   items: array<FeedPreviewItem>,
     *   title?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->items = $values['items'];
        $this->title = $values['title'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
