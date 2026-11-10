<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PostWarningChannelsDropped extends JsonSerializableType
{
    /**
     * @var array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public array $channelIds;

    /**
     * @var string $channelSetId
     */
    #[JsonProperty('channelSetId')]
    public string $channelSetId;

    /**
     * @var string $channelSetName
     */
    #[JsonProperty('channelSetName')]
    public string $channelSetName;

    /**
     * @param array{
     *   channelIds: array<string>,
     *   channelSetId: string,
     *   channelSetName: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelIds = $values['channelIds'];
        $this->channelSetId = $values['channelSetId'];
        $this->channelSetName = $values['channelSetName'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
