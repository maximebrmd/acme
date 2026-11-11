<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PostTimingQueue extends JsonSerializableType
{
    /**
     * @var ?string $queueId
     */
    #[JsonProperty('queueId')]
    public ?string $queueId;

    /**
     * @param array{
     *   queueId?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->queueId = $values['queueId'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
