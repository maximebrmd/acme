<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class BreakingChange extends JsonSerializableType
{
    /**
     * @var string $change
     */
    #[JsonProperty('change')]
    public string $change;

    /**
     * @var string $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @param array{
     *   change: string,
     *   reason: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->change = $values['change'];
        $this->reason = $values['reason'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
