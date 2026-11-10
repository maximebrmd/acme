<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PartnerOwnsWorkspacesEncoded extends JsonSerializableType
{
    /**
     * @var value-of<PartnerOwnsWorkspacesEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var int $owned
     */
    #[JsonProperty('owned')]
    public int $owned;

    /**
     * @param array{
     *   tag: value-of<PartnerOwnsWorkspacesEncodedTag>,
     *   owned: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->owned = $values['owned'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
