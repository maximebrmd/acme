<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ChannelSetDetails extends JsonSerializableType
{
    /**
     * @var array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public array $channelIds;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?array<ChannelOptions> $options
     */
    #[JsonProperty('options'), ArrayType([ChannelOptions::class])]
    public ?array $options;

    /**
     * @param array{
     *   channelIds: array<string>,
     *   name: string,
     *   options?: ?array<ChannelOptions>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelIds = $values['channelIds'];
        $this->name = $values['name'];
        $this->options = $values['options'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
