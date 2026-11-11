<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class QueueReshuffle extends JsonSerializableType
{
    /**
     * @var int $moved
     */
    #[JsonProperty('moved')]
    public int $moved;

    /**
     * @var int $remaining
     */
    #[JsonProperty('remaining')]
    public int $remaining;

    /**
     * @var ?value-of<ReshuffleStop> $stoppedBy
     */
    #[JsonProperty('stoppedBy')]
    public ?string $stoppedBy;

    /**
     * @var int $unchanged
     */
    #[JsonProperty('unchanged')]
    public int $unchanged;

    /**
     * @param array{
     *   moved: int,
     *   remaining: int,
     *   unchanged: int,
     *   stoppedBy?: ?value-of<ReshuffleStop>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->moved = $values['moved'];
        $this->remaining = $values['remaining'];
        $this->stoppedBy = $values['stoppedBy'] ?? null;
        $this->unchanged = $values['unchanged'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
