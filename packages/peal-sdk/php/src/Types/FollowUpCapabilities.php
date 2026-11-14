<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class FollowUpCapabilities extends JsonSerializableType
{
    /**
     * @var ?value-of<FollowUpCapabilitiesCommentNeeds> $commentNeeds
     */
    #[JsonProperty('commentNeeds')]
    public ?string $commentNeeds;

    /**
     * @var ?array<TextLimit> $commentTextLimits
     */
    #[JsonProperty('commentTextLimits'), ArrayType([TextLimit::class])]
    public ?array $commentTextLimits;

    /**
     * @var value-of<FollowUpCapabilitiesKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var int $maxCount
     */
    #[JsonProperty('maxCount')]
    public int $maxCount;

    /**
     * @param array{
     *   kind: value-of<FollowUpCapabilitiesKind>,
     *   maxCount: int,
     *   commentNeeds?: ?value-of<FollowUpCapabilitiesCommentNeeds>,
     *   commentTextLimits?: ?array<TextLimit>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->commentNeeds = $values['commentNeeds'] ?? null;
        $this->commentTextLimits = $values['commentTextLimits'] ?? null;
        $this->kind = $values['kind'];
        $this->maxCount = $values['maxCount'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
