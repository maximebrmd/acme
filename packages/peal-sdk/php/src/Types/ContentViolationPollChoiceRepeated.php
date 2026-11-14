<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ContentViolationPollChoiceRepeated extends JsonSerializableType
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
     * @param array{
     *   channelId: string,
     *   platform: value-of<Platform>,
     *   choice: int,
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
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
