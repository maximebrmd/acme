<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ContentViolationPollDurationOutOfRange extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var ?int $part
     */
    #[JsonProperty('part')]
    public ?int $part;

    /**
     * @var value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public string $platform;

    /**
     * @var int $durationMinutes
     */
    #[JsonProperty('durationMinutes')]
    public int $durationMinutes;

    /**
     * @var int $maximumMinutes
     */
    #[JsonProperty('maximumMinutes')]
    public int $maximumMinutes;

    /**
     * @var int $minimumMinutes
     */
    #[JsonProperty('minimumMinutes')]
    public int $minimumMinutes;

    /**
     * @param array{
     *   channelId: string,
     *   platform: value-of<Platform>,
     *   durationMinutes: int,
     *   maximumMinutes: int,
     *   minimumMinutes: int,
     *   part?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->part = $values['part'] ?? null;
        $this->platform = $values['platform'];
        $this->durationMinutes = $values['durationMinutes'];
        $this->maximumMinutes = $values['maximumMinutes'];
        $this->minimumMinutes = $values['minimumMinutes'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
