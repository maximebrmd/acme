<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventAllowanceReached extends JsonSerializableType
{
    /**
     * @var int $allowed
     */
    #[JsonProperty('allowed')]
    public int $allowed;

    /**
     * @var value-of<Meter> $meter
     */
    #[JsonProperty('meter')]
    public string $meter;

    /**
     * @var string $resetsAt
     */
    #[JsonProperty('resetsAt')]
    public string $resetsAt;

    /**
     * @param array{
     *   allowed: int,
     *   meter: value-of<Meter>,
     *   resetsAt: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->allowed = $values['allowed'];
        $this->meter = $values['meter'];
        $this->resetsAt = $values['resetsAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
