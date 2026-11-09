<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class MediaInUseEncoded extends JsonSerializableType
{
    /**
     * @var value-of<MediaInUseEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var array<string> $postIds
     */
    #[JsonProperty('postIds'), ArrayType(['string'])]
    public array $postIds;

    /**
     * @param array{
     *   tag: value-of<MediaInUseEncodedTag>,
     *   postIds: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->postIds = $values['postIds'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
