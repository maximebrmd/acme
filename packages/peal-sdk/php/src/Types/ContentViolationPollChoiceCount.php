<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ContentViolationPollChoiceCount extends JsonSerializableType
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
     * @var int $count
     */
    #[JsonProperty('count')]
    public int $count;

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
     *   count: int,
     *   maximum: int,
     *   minimum: int,
     *   part?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->part = $values['part'] ?? null;
        $this->platform = $values['platform'];
        $this->count = $values['count'];
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
