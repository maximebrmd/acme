<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PartnerUsageDay extends JsonSerializableType
{
    /**
     * @var int $channels
     */
    #[JsonProperty('channels')]
    public int $channels;

    /**
     * @var string $day
     */
    #[JsonProperty('day')]
    public string $day;

    /**
     * @var int $workspaces
     */
    #[JsonProperty('workspaces')]
    public int $workspaces;

    /**
     * @param array{
     *   channels: int,
     *   day: string,
     *   workspaces: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channels = $values['channels'];
        $this->day = $values['day'];
        $this->workspaces = $values['workspaces'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
