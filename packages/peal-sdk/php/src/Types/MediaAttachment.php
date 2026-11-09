<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class MediaAttachment extends JsonSerializableType
{
    /**
     * @var string $altText
     */
    #[JsonProperty('altText')]
    public string $altText;

    /**
     * @var string $mediaId
     */
    #[JsonProperty('mediaId')]
    public string $mediaId;

    /**
     * @param array{
     *   altText: string,
     *   mediaId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->altText = $values['altText'];
        $this->mediaId = $values['mediaId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
