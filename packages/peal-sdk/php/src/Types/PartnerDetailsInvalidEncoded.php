<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PartnerDetailsInvalidEncoded extends JsonSerializableType
{
    /**
     * @var value-of<PartnerDetailsInvalidEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var value-of<PartnerDetailField> $field
     */
    #[JsonProperty('field')]
    public string $field;

    /**
     * @param array{
     *   tag: value-of<PartnerDetailsInvalidEncodedTag>,
     *   field: value-of<PartnerDetailField>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->field = $values['field'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
