<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class FollowerChange extends JsonSerializableType
{
    /**
     * @var ?int $current
     */
    #[JsonProperty('current')]
    public ?int $current;

    /**
     * @var ?int $gained
     */
    #[JsonProperty('gained')]
    public ?int $gained;

    /**
     * @param array{
     *   current?: ?int,
     *   gained?: ?int,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->current = $values['current'] ?? null;
        $this->gained = $values['gained'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
