<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class EffectHttpApiErrorBadRequestEncoded extends JsonSerializableType
{
    /**
     * @var value-of<EffectHttpApiErrorBadRequestEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @param array{
     *   tag: value-of<EffectHttpApiErrorBadRequestEncodedTag>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
