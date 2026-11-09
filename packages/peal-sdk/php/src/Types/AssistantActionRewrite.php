<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AssistantActionRewrite extends JsonSerializableType
{
    /**
     * @var value-of<AssistantTone> $tone
     */
    #[JsonProperty('tone')]
    public string $tone;

    /**
     * @param array{
     *   tone: value-of<AssistantTone>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tone = $values['tone'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
