<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class FollowUpCapabilities extends JsonSerializableType
{
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
     * } $values
     */
    public function __construct(
        array $values,
    ) {
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
