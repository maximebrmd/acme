<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class QueueSlot extends JsonSerializableType
{
    /**
     * @var value-of<Weekday> $day
     */
    #[JsonProperty('day')]
    public string $day;

    /**
     * @var string $time
     */
    #[JsonProperty('time')]
    public string $time;

    /**
     * @param array{
     *   day: value-of<Weekday>,
     *   time: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->day = $values['day'];
        $this->time = $values['time'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
