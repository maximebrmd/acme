<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class CreatedFeed extends JsonSerializableType
{
    /**
     * @var Feed $feed
     */
    #[JsonProperty('feed')]
    public Feed $feed;

    /**
     * @var int $seen
     */
    #[JsonProperty('seen')]
    public int $seen;

    /**
     * @param array{
     *   feed: Feed,
     *   seen: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->feed = $values['feed'];
        $this->seen = $values['seen'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
