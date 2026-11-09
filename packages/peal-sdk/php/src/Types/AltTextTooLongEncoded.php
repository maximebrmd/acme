<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AltTextTooLongEncoded extends JsonSerializableType
{
    /**
     * @var value-of<AltTextTooLongEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var int $maxLength
     */
    #[JsonProperty('maxLength')]
    public int $maxLength;

    /**
     * @param array{
     *   tag: value-of<AltTextTooLongEncodedTag>,
     *   maxLength: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->maxLength = $values['maxLength'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
