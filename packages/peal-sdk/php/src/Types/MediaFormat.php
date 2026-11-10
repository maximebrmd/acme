<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class MediaFormat extends JsonSerializableType
{
    /**
     * @var value-of<MediaContentType> $contentType
     */
    #[JsonProperty('contentType')]
    public string $contentType;

    /**
     * @var value-of<MediaKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var ?float $maxAspectRatio
     */
    #[JsonProperty('maxAspectRatio')]
    public ?float $maxAspectRatio;

    /**
     * @var ?int $maxByteSize
     */
    #[JsonProperty('maxByteSize')]
    public ?int $maxByteSize;

    /**
     * @var ?int $maxDurationMs
     */
    #[JsonProperty('maxDurationMs')]
    public ?int $maxDurationMs;

    /**
     * @var ?int $maxMediaWith
     */
    #[JsonProperty('maxMediaWith')]
    public ?int $maxMediaWith;

    /**
     * @var ?int $maxPixels
     */
    #[JsonProperty('maxPixels')]
    public ?int $maxPixels;

    /**
     * @var ?int $maxSide
     */
    #[JsonProperty('maxSide')]
    public ?int $maxSide;

    /**
     * @var ?float $minAspectRatio
     */
    #[JsonProperty('minAspectRatio')]
    public ?float $minAspectRatio;

    /**
     * @var ?int $minByteSize
     */
    #[JsonProperty('minByteSize')]
    public ?int $minByteSize;

    /**
     * @var ?int $minDurationMs
     */
    #[JsonProperty('minDurationMs')]
    public ?int $minDurationMs;

    /**
     * @var ?int $minSide
     */
    #[JsonProperty('minSide')]
    public ?int $minSide;

    /**
     * @param array{
     *   contentType: value-of<MediaContentType>,
     *   kind: value-of<MediaKind>,
     *   maxAspectRatio?: ?float,
     *   maxByteSize?: ?int,
     *   maxDurationMs?: ?int,
     *   maxMediaWith?: ?int,
     *   maxPixels?: ?int,
     *   maxSide?: ?int,
     *   minAspectRatio?: ?float,
     *   minByteSize?: ?int,
     *   minDurationMs?: ?int,
     *   minSide?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->contentType = $values['contentType'];
        $this->kind = $values['kind'];
        $this->maxAspectRatio = $values['maxAspectRatio'] ?? null;
        $this->maxByteSize = $values['maxByteSize'] ?? null;
        $this->maxDurationMs = $values['maxDurationMs'] ?? null;
        $this->maxMediaWith = $values['maxMediaWith'] ?? null;
        $this->maxPixels = $values['maxPixels'] ?? null;
        $this->maxSide = $values['maxSide'] ?? null;
        $this->minAspectRatio = $values['minAspectRatio'] ?? null;
        $this->minByteSize = $values['minByteSize'] ?? null;
        $this->minDurationMs = $values['minDurationMs'] ?? null;
        $this->minSide = $values['minSide'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
