<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class AssistantImagesStatus extends JsonSerializableType
{
    /**
     * @var array<value-of<ImageAspect>> $aspects
     */
    #[JsonProperty('aspects'), ArrayType(['string'])]
    public array $aspects;

    /**
     * @var bool $available
     */
    #[JsonProperty('available')]
    public bool $available;

    /**
     * @var int $maxPromptLength
     */
    #[JsonProperty('maxPromptLength')]
    public int $maxPromptLength;

    /**
     * @var int $requestCost
     */
    #[JsonProperty('requestCost')]
    public int $requestCost;

    /**
     * @param array{
     *   aspects: array<value-of<ImageAspect>>,
     *   available: bool,
     *   maxPromptLength: int,
     *   requestCost: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->aspects = $values['aspects'];
        $this->available = $values['available'];
        $this->maxPromptLength = $values['maxPromptLength'];
        $this->requestCost = $values['requestCost'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
