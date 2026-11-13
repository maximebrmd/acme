<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ReviewedChannel extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var array<ReviewedPart> $followUps
     */
    #[JsonProperty('followUps'), ArrayType([ReviewedPart::class])]
    public array $followUps;

    /**
     * @var ?string $handle
     */
    #[JsonProperty('handle')]
    public ?string $handle;

    /**
     * @var ?array<ReviewedMedia> $media
     */
    #[JsonProperty('media'), ArrayType([ReviewedMedia::class])]
    public ?array $media;

    /**
     * @var ?TargetOptions $options
     */
    #[JsonProperty('options')]
    public ?TargetOptions $options;

    /**
     * @var ?value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public ?string $platform;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   channelId: string,
     *   followUps: array<ReviewedPart>,
     *   text: string,
     *   handle?: ?string,
     *   media?: ?array<ReviewedMedia>,
     *   options?: ?TargetOptions,
     *   platform?: ?value-of<Platform>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->followUps = $values['followUps'];
        $this->handle = $values['handle'] ?? null;
        $this->media = $values['media'] ?? null;
        $this->options = $values['options'] ?? null;
        $this->platform = $values['platform'] ?? null;
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
