<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ContentViolationTextTooLong extends JsonSerializableType
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
     * @var int $length
     */
    #[JsonProperty('length')]
    public int $length;

    /**
     * @var int $maximum
     */
    #[JsonProperty('maximum')]
    public int $maximum;

    /**
     * @var value-of<TextUnit> $unit
     */
    #[JsonProperty('unit')]
    public string $unit;

    /**
     * @param array{
     *   channelId: string,
     *   platform: value-of<Platform>,
     *   length: int,
     *   maximum: int,
     *   unit: value-of<TextUnit>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->platform = $values['platform'];
        $this->length = $values['length'];
        $this->maximum = $values['maximum'];
        $this->unit = $values['unit'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
