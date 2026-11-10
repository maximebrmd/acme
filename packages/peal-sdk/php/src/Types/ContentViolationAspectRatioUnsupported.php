<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\Union;

class ContentViolationAspectRatioUnsupported extends JsonSerializableType
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
     * @var (
     *    float
     *   |value-of<NonFiniteNumber>
     * ) $maximum
     */
    #[JsonProperty('maximum'), Union('float', 'string')]
    public float|string $maximum;

    /**
     * @var (
     *    float
     *   |value-of<NonFiniteNumber>
     * ) $minimum
     */
    #[JsonProperty('minimum'), Union('float', 'string')]
    public float|string $minimum;

    /**
     * @param array{
     *   channelId: string,
     *   platform: value-of<Platform>,
     *   mediaId: string,
     *   height: int,
     *   width: int,
     *   maximum: (
     *    float
     *   |value-of<NonFiniteNumber>
     * ),
     *   minimum: (
     *    float
     *   |value-of<NonFiniteNumber>
     * ),
     *   part?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->part = $values['part'] ?? null;
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
