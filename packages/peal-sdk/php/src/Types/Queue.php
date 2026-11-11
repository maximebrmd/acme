<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class Queue extends JsonSerializableType
{
    /**
     * @var array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public array $channelIds;

    /**
     * @var ?string $channelSetId
     */
    #[JsonProperty('channelSetId')]
    public ?string $channelSetId;

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
     * @var bool $isDefault
     */
    #[JsonProperty('isDefault')]
    public bool $isDefault;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var array<QueueSlot> $slots
     */
    #[JsonProperty('slots'), ArrayType([QueueSlot::class])]
    public array $slots;

    /**
     * @var string $timeZone
     */
    #[JsonProperty('timeZone')]
    public string $timeZone;

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
     *   isDefault: bool,
     *   name: string,
     *   slots: array<QueueSlot>,
     *   timeZone: string,
     *   unavailableChannelIds: array<string>,
     *   channelSetId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelIds = $values['channelIds'];
        $this->channelSetId = $values['channelSetId'] ?? null;
        $this->createdAt = $values['createdAt'];
        $this->id = $values['id'];
        $this->isDefault = $values['isDefault'];
        $this->name = $values['name'];
        $this->slots = $values['slots'];
        $this->timeZone = $values['timeZone'];
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
