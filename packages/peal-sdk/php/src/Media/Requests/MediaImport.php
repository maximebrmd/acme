<?php

namespace Peal\Media\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class MediaImport extends JsonSerializableType
{
    /**
     * @var ?string $altText
     */
    #[JsonProperty('altText')]
    public ?string $altText;

    /**
     * @var string $url
     */
    #[JsonProperty('url')]
    public string $url;

    /**
     * @param array{
     *   url: string,
     *   altText?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->altText = $values['altText'] ?? null;
        $this->url = $values['url'];
    }
}
