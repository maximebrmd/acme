<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PostUnpublish extends JsonSerializableType
{
    /**
     * @var array<LivePostChange> $changes
     */
    #[JsonProperty('changes'), ArrayType([LivePostChange::class])]
    public array $changes;

    /**
     * @var array<LivePostRefusedTarget> $refused
     */
    #[JsonProperty('refused'), ArrayType([LivePostRefusedTarget::class])]
    public array $refused;

    /**
     * @param array{
     *   changes: array<LivePostChange>,
     *   refused: array<LivePostRefusedTarget>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->changes = $values['changes'];
        $this->refused = $values['refused'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
