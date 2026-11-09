<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ContentViolationForbiddenCharacters extends JsonSerializableType
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
     * @var array<string> $characters
     */
    #[JsonProperty('characters'), ArrayType(['string'])]
    public array $characters;

    /**
     * @param array{
     *   channelId: string,
     *   platform: value-of<Platform>,
     *   characters: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->platform = $values['platform'];
        $this->characters = $values['characters'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
