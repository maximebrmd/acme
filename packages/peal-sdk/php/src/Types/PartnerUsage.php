<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PartnerUsage extends JsonSerializableType
{
    /**
     * @var int $channels
     */
    #[JsonProperty('channels')]
    public int $channels;

    /**
     * @var array<PartnerUsageDay> $days
     */
    #[JsonProperty('days'), ArrayType([PartnerUsageDay::class])]
    public array $days;

    /**
     * @var int $workspaces
     */
    #[JsonProperty('workspaces')]
    public int $workspaces;

    /**
     * @param array{
     *   channels: int,
     *   days: array<PartnerUsageDay>,
     *   workspaces: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channels = $values['channels'];
        $this->days = $values['days'];
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
