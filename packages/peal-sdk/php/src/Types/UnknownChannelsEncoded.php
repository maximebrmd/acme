<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class UnknownChannelsEncoded extends JsonSerializableType
{
    /**
     * @var array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public array $channelIds;

    /**
     * @param array{
     *   channelIds: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelIds = $values['channelIds'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
