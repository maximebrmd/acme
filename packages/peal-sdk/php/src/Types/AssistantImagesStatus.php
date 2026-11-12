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
     * @var int $dailyLimit
     */
    #[JsonProperty('dailyLimit')]
    public int $dailyLimit;

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
     * @var ?value-of<AssistantImageSource> $source
     */
    #[JsonProperty('source')]
    public ?string $source;

    /**
     * @param array{
     *   aspects: array<value-of<ImageAspect>>,
     *   available: bool,
     *   dailyLimit: int,
     *   maxPromptLength: int,
     *   requestCost: int,
     *   source?: ?value-of<AssistantImageSource>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->aspects = $values['aspects'];
        $this->available = $values['available'];
        $this->dailyLimit = $values['dailyLimit'];
        $this->maxPromptLength = $values['maxPromptLength'];
        $this->requestCost = $values['requestCost'];
        $this->source = $values['source'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
