<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ContentViolationPollChoiceLength extends JsonSerializableType
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
     * @var int $choice
     */
    #[JsonProperty('choice')]
    public int $choice;

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
     *   choice: int,
     *   length: int,
     *   maximum: int,
     *   unit: value-of<TextUnit>,
     *   part?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->part = $values['part'] ?? null;
        $this->platform = $values['platform'];
        $this->choice = $values['choice'];
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
