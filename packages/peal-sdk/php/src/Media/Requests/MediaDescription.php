<?php

namespace Peal\Media\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class MediaDescription extends JsonSerializableType
{
    /**
     * @var ?string $altText
     */
    #[JsonProperty('altText')]
    public ?string $altText;

    /**
     * @param array{
     *   altText?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->altText = $values['altText'] ?? null;
    }
}
