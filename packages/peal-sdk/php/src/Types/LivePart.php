<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class LivePart extends JsonSerializableType
{
    /**
     * @var int $index
     */
    #[JsonProperty('index')]
    public int $index;

    /**
     * @var ?string $permalink
     */
    #[JsonProperty('permalink')]
    public ?string $permalink;

    /**
     * @var ?string $platformPostId
     */
    #[JsonProperty('platformPostId')]
    public ?string $platformPostId;

    /**
     * @var string $publishedAt
     */
    #[JsonProperty('publishedAt')]
    public string $publishedAt;

    /**
     * @param array{
     *   index: int,
     *   publishedAt: string,
     *   permalink?: ?string,
     *   platformPostId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->index = $values['index'];
        $this->permalink = $values['permalink'] ?? null;
        $this->platformPostId = $values['platformPostId'] ?? null;
        $this->publishedAt = $values['publishedAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
