<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ContentViolationSideOutOfRange extends JsonSerializableType
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
     * @var int $height
     */
    #[JsonProperty('height')]
    public int $height;

    /**
     * @var int $width
     */
    #[JsonProperty('width')]
    public int $width;

    /**
     * @var int $maximum
     */
    #[JsonProperty('maximum')]
    public int $maximum;

    /**
     * @var int $minimum
     */
    #[JsonProperty('minimum')]
    public int $minimum;

    /**
     * @param array{
     *   channelId: string,
     *   platform: value-of<Platform>,
     *   mediaId: string,
     *   height: int,
     *   width: int,
     *   maximum: int,
     *   minimum: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->platform = $values['platform'];
        $this->mediaId = $values['mediaId'];
        $this->height = $values['height'];
        $this->width = $values['width'];
        $this->maximum = $values['maximum'];
        $this->minimum = $values['minimum'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
