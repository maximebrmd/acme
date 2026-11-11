<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class LivePostRefusedTarget extends JsonSerializableType
{
    /**
     * @var value-of<LivePostRefusal> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @var string $targetId
     */
    #[JsonProperty('targetId')]
    public string $targetId;

    /**
     * @param array{
     *   reason: value-of<LivePostRefusal>,
     *   targetId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->reason = $values['reason'];
        $this->targetId = $values['targetId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
