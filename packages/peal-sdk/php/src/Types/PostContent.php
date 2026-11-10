<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PostContent extends JsonSerializableType
{
    /**
     * @var ?array<PostPart> $followUps
     */
    #[JsonProperty('followUps'), ArrayType([PostPart::class])]
    public ?array $followUps;

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
     *   media: array<MediaAttachment>,
     *   overrides: array<TextOverride>,
     *   text: string,
     *   followUps?: ?array<PostPart>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->followUps = $values['followUps'] ?? null;
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
