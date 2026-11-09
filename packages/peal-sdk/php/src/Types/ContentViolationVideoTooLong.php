<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ContentViolationVideoTooLong extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public string $platform;

    /**
     * @var string $mediaId
     */
    #[JsonProperty('mediaId')]
    public string $mediaId;

    /**
     * @var int $durationMs
     */
    #[JsonProperty('durationMs')]
    public int $durationMs;

    /**
     * @var int $maximumMs
     */
    #[JsonProperty('maximumMs')]
    public int $maximumMs;

    /**
     * @param array{
     *   channelId: string,
     *   platform: value-of<Platform>,
     *   mediaId: string,
     *   durationMs: int,
     *   maximumMs: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->platform = $values['platform'];
        $this->mediaId = $values['mediaId'];
        $this->durationMs = $values['durationMs'];
        $this->maximumMs = $values['maximumMs'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
