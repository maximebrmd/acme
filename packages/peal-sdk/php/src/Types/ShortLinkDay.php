<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ShortLinkDay extends JsonSerializableType
{
    /**
     * @var int $clicks
     */
    #[JsonProperty('clicks')]
    public int $clicks;

    /**
     * @var string $day
     */
    #[JsonProperty('day')]
    public string $day;

    /**
     * @param array{
     *   clicks: int,
     *   day: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->clicks = $values['clicks'];
        $this->day = $values['day'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
