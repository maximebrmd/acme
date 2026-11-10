<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ChannelPage extends JsonSerializableType
{
    /**
     * @var ChannelPageCounts $counts
     */
    #[JsonProperty('counts')]
    public ChannelPageCounts $counts;

    /**
     * @var array<Channel> $items
     */
    #[JsonProperty('items'), ArrayType([Channel::class])]
    public array $items;

    /**
     * @var ?string $nextCursor
     */
    #[JsonProperty('nextCursor')]
    public ?string $nextCursor;

    /**
     * @param array{
     *   counts: ChannelPageCounts,
     *   items: array<Channel>,
     *   nextCursor?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->counts = $values['counts'];
        $this->items = $values['items'];
        $this->nextCursor = $values['nextCursor'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
