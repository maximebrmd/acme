<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ReviewedPart extends JsonSerializableType
{
    /**
     * @var int $delaySeconds
     */
    #[JsonProperty('delaySeconds')]
    public int $delaySeconds;

    /**
     * @var array<ReviewedMedia> $media
     */
    #[JsonProperty('media'), ArrayType([ReviewedMedia::class])]
    public array $media;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   delaySeconds: int,
     *   media: array<ReviewedMedia>,
     *   text: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->delaySeconds = $values['delaySeconds'];
        $this->media = $values['media'];
        $this->text = $values['text'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
