<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class QueueDetails extends JsonSerializableType
{
    /**
     * @var ?array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public ?array $channelIds;

    /**
     * @var ?string $channelSetId
     */
    #[JsonProperty('channelSetId')]
    public ?string $channelSetId;

    /**
     * @var ?bool $isDefault
     */
    #[JsonProperty('isDefault')]
    public ?bool $isDefault;

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
     * @param array{
     *   name: string,
     *   slots: array<QueueSlot>,
     *   timeZone: string,
     *   channelIds?: ?array<string>,
     *   channelSetId?: ?string,
     *   isDefault?: ?bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelIds = $values['channelIds'] ?? null;
        $this->channelSetId = $values['channelSetId'] ?? null;
        $this->isDefault = $values['isDefault'] ?? null;
        $this->name = $values['name'];
        $this->slots = $values['slots'];
        $this->timeZone = $values['timeZone'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
