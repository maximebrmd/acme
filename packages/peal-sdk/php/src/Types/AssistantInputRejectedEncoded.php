<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AssistantInputRejectedEncoded extends JsonSerializableType
{
    /**
     * @var value-of<AssistantInputRejectedEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var int $maxLength
     */
    #[JsonProperty('maxLength')]
    public int $maxLength;

    /**
     * @var value-of<AssistantInputRejectedEncodedReason> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @param array{
     *   tag: value-of<AssistantInputRejectedEncodedTag>,
     *   maxLength: int,
     *   reason: value-of<AssistantInputRejectedEncodedReason>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->maxLength = $values['maxLength'];
        $this->reason = $values['reason'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
