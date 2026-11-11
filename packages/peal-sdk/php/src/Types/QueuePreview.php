<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class QueuePreview extends JsonSerializableType
{
    /**
     * @var ?string $nextFree
     */
    #[JsonProperty('nextFree')]
    public ?string $nextFree;

    /**
     * @var ?value-of<QueueNoRoom> $noRoom
     */
    #[JsonProperty('noRoom')]
    public ?string $noRoom;

    /**
     * @var array<PreviewSlot> $slots
     */
    #[JsonProperty('slots'), ArrayType([PreviewSlot::class])]
    public array $slots;

    /**
     * @param array{
     *   slots: array<PreviewSlot>,
     *   nextFree?: ?string,
     *   noRoom?: ?value-of<QueueNoRoom>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->nextFree = $values['nextFree'] ?? null;
        $this->noRoom = $values['noRoom'] ?? null;
        $this->slots = $values['slots'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
