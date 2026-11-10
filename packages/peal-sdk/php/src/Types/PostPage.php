<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PostPage extends JsonSerializableType
{
    /**
     * @var array<PostChannel> $channels
     */
    #[JsonProperty('channels'), ArrayType([PostChannel::class])]
    public array $channels;

    /**
     * @var array<Post> $items
     */
    #[JsonProperty('items'), ArrayType([Post::class])]
    public array $items;

    /**
     * @var ?string $nextCursor
     */
    #[JsonProperty('nextCursor')]
    public ?string $nextCursor;

    /**
     * @param array{
     *   channels: array<PostChannel>,
     *   items: array<Post>,
     *   nextCursor?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channels = $values['channels'];
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
