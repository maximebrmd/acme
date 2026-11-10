<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PartPreview extends JsonSerializableType
{
    /**
     * @var LimitedCount $hashtags
     */
    #[JsonProperty('hashtags')]
    public LimitedCount $hashtags;

    /**
     * @var LimitedCount $links
     */
    #[JsonProperty('links')]
    public LimitedCount $links;

    /**
     * @var LimitedCount $media
     */
    #[JsonProperty('media')]
    public LimitedCount $media;

    /**
     * @var LimitedCount $mentions
     */
    #[JsonProperty('mentions')]
    public LimitedCount $mentions;

    /**
     * @var int $part
     */
    #[JsonProperty('part')]
    public int $part;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @var array<TextCount> $textCounts
     */
    #[JsonProperty('textCounts'), ArrayType([TextCount::class])]
    public array $textCounts;

    /**
     * @param array{
     *   hashtags: LimitedCount,
     *   links: LimitedCount,
     *   media: LimitedCount,
     *   mentions: LimitedCount,
     *   part: int,
     *   text: string,
     *   textCounts: array<TextCount>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->hashtags = $values['hashtags'];
        $this->links = $values['links'];
        $this->media = $values['media'];
        $this->mentions = $values['mentions'];
        $this->part = $values['part'];
        $this->text = $values['text'];
        $this->textCounts = $values['textCounts'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
