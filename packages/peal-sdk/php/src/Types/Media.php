<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class Media extends JsonSerializableType
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
     * @var ?string $codec
     */
    #[JsonProperty('codec')]
    public ?string $codec;

    /**
     * @var value-of<MediaContentType> $contentType
     */
    #[JsonProperty('contentType')]
    public string $contentType;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var ?MediaDimensions $dimensions
     */
    #[JsonProperty('dimensions')]
    public ?MediaDimensions $dimensions;

    /**
     * @var ?int $durationMs
     */
    #[JsonProperty('durationMs')]
    public ?int $durationMs;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<MediaKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var MediaStatus $status
     */
    #[JsonProperty('status')]
    public MediaStatus $status;

    /**
     * @var string $updatedAt
     */
    #[JsonProperty('updatedAt')]
    public string $updatedAt;

    /**
     * @var ?string $url
     */
    #[JsonProperty('url')]
    public ?string $url;

    /**
     * @param array{
     *   byteSize: int,
     *   contentType: value-of<MediaContentType>,
     *   createdAt: string,
     *   id: string,
     *   kind: value-of<MediaKind>,
     *   status: MediaStatus,
     *   updatedAt: string,
     *   altText?: ?string,
     *   codec?: ?string,
     *   dimensions?: ?MediaDimensions,
     *   durationMs?: ?int,
     *   url?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->altText = $values['altText'] ?? null;
        $this->byteSize = $values['byteSize'];
        $this->codec = $values['codec'] ?? null;
        $this->contentType = $values['contentType'];
        $this->createdAt = $values['createdAt'];
        $this->dimensions = $values['dimensions'] ?? null;
        $this->durationMs = $values['durationMs'] ?? null;
        $this->id = $values['id'];
        $this->kind = $values['kind'];
        $this->status = $values['status'];
        $this->updatedAt = $values['updatedAt'];
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
