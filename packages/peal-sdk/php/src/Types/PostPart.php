<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PostPart extends JsonSerializableType
{
    /**
     * @var int $delaySeconds
     */
    #[JsonProperty('delaySeconds')]
    public int $delaySeconds;

    /**
     * @var array<MediaAttachment> $media
     */
    #[JsonProperty('media'), ArrayType([MediaAttachment::class])]
    public array $media;

    /**
     * @var array<TextOverride> $overrides
     */
    #[JsonProperty('overrides'), ArrayType([TextOverride::class])]
    public array $overrides;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   delaySeconds: int,
     *   media: array<MediaAttachment>,
     *   overrides: array<TextOverride>,
     *   text: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->delaySeconds = $values['delaySeconds'];
        $this->media = $values['media'];
        $this->overrides = $values['overrides'];
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
