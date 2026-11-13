<?php

namespace Peal\Media\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NewUpload extends JsonSerializableType
{
    /**
     * @var ?string $altText
     */
    #[JsonProperty('altText')]
    public ?string $altText;

    /**
     * @var int $byteSize
     */
    #[JsonProperty('byteSize')]
    public int $byteSize;

    /**
     * @var string $contentType
     */
    #[JsonProperty('contentType')]
    public string $contentType;

    /**
     * @var ?string $fileName
     */
    #[JsonProperty('fileName')]
    public ?string $fileName;

    /**
     * @param array{
     *   byteSize: int,
     *   contentType: string,
     *   altText?: ?string,
     *   fileName?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->altText = $values['altText'] ?? null;
        $this->byteSize = $values['byteSize'];
        $this->contentType = $values['contentType'];
        $this->fileName = $values['fileName'] ?? null;
    }
}
