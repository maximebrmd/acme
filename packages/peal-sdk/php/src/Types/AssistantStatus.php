<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AssistantStatus extends JsonSerializableType
{
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
     * @var AssistantImagesStatus $images
     */
    #[JsonProperty('images')]
    public AssistantImagesStatus $images;

    /**
     * @var int $maxTextLength
     */
    #[JsonProperty('maxTextLength')]
    public int $maxTextLength;

    /**
     * @var int $remaining
     */
    #[JsonProperty('remaining')]
    public int $remaining;

    /**
     * @var string $resetsAt
     */
    #[JsonProperty('resetsAt')]
    public string $resetsAt;

    /**
     * @var ?value-of<AssistantTextSource> $source
     */
    #[JsonProperty('source')]
    public ?string $source;

    /**
     * @param array{
     *   available: bool,
     *   dailyLimit: int,
     *   images: AssistantImagesStatus,
     *   maxTextLength: int,
     *   remaining: int,
     *   resetsAt: string,
     *   source?: ?value-of<AssistantTextSource>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->available = $values['available'];
        $this->dailyLimit = $values['dailyLimit'];
        $this->images = $values['images'];
        $this->maxTextLength = $values['maxTextLength'];
        $this->remaining = $values['remaining'];
        $this->resetsAt = $values['resetsAt'];
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
