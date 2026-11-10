<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ChannelSet extends JsonSerializableType
{
    /**
     * @var array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public array $channelIds;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var array<ChannelOptions> $options
     */
    #[JsonProperty('options'), ArrayType([ChannelOptions::class])]
    public array $options;

    /**
     * @var array<string> $unavailableChannelIds
     */
    #[JsonProperty('unavailableChannelIds'), ArrayType(['string'])]
    public array $unavailableChannelIds;

    /**
     * @param array{
     *   channelIds: array<string>,
     *   createdAt: string,
     *   id: string,
     *   name: string,
     *   options: array<ChannelOptions>,
     *   unavailableChannelIds: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelIds = $values['channelIds'];
        $this->createdAt = $values['createdAt'];
        $this->id = $values['id'];
        $this->name = $values['name'];
        $this->options = $values['options'];
        $this->unavailableChannelIds = $values['unavailableChannelIds'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
