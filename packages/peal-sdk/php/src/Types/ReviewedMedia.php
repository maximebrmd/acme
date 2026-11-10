<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ReviewedMedia extends JsonSerializableType
{
    /**
     * @var string $altText
     */
    #[JsonProperty('altText')]
    public string $altText;

    /**
     * @var ?value-of<MediaKind> $kind
     */
    #[JsonProperty('kind')]
    public ?string $kind;

    /**
     * @var string $mediaId
     */
    #[JsonProperty('mediaId')]
    public string $mediaId;

    /**
     * @var ?string $url
     */
    #[JsonProperty('url')]
    public ?string $url;

    /**
     * @param array{
     *   altText: string,
     *   mediaId: string,
     *   kind?: ?value-of<MediaKind>,
     *   url?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->altText = $values['altText'];
        $this->kind = $values['kind'] ?? null;
        $this->mediaId = $values['mediaId'];
        $this->url = $values['url'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
