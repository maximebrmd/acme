<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ChannelDefaults extends JsonSerializableType
{
    /**
     * @var ?TargetOptions $options
     */
    #[JsonProperty('options')]
    public ?TargetOptions $options;

    /**
     * @param array{
     *   options?: ?TargetOptions,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
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
