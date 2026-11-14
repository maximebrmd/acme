<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class InboxMessageSettings extends JsonSerializableType
{
    /**
     * @var array<InboxMessageApplication> $applications
     */
    #[JsonProperty('applications'), ArrayType([InboxMessageApplication::class])]
    public array $applications;

    /**
     * @var array<InboxMessageChannel> $channels
     */
    #[JsonProperty('channels'), ArrayType([InboxMessageChannel::class])]
    public array $channels;

    /**
     * @param array{
     *   applications: array<InboxMessageApplication>,
     *   channels: array<InboxMessageChannel>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->applications = $values['applications'];
        $this->channels = $values['channels'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
