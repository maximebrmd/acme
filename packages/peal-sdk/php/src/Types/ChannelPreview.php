<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ChannelPreview extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

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
     * @var array<PartPreview> $parts
     */
    #[JsonProperty('parts'), ArrayType([PartPreview::class])]
    public array $parts;

    /**
     * @var value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public string $platform;

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
     * @var ?bool $textNotSent
     */
    #[JsonProperty('textNotSent')]
    public ?bool $textNotSent;

    /**
     * @var array<ContentViolation> $violations
     */
    #[JsonProperty('violations'), ArrayType([ContentViolation::class])]
    public array $violations;

    /**
     * @param array{
     *   channelId: string,
     *   hashtags: LimitedCount,
     *   links: LimitedCount,
     *   media: LimitedCount,
     *   mentions: LimitedCount,
     *   parts: array<PartPreview>,
     *   platform: value-of<Platform>,
     *   text: string,
     *   textCounts: array<TextCount>,
     *   violations: array<ContentViolation>,
     *   textNotSent?: ?bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->hashtags = $values['hashtags'];
        $this->links = $values['links'];
        $this->media = $values['media'];
        $this->mentions = $values['mentions'];
        $this->parts = $values['parts'];
        $this->platform = $values['platform'];
        $this->text = $values['text'];
        $this->textCounts = $values['textCounts'];
        $this->textNotSent = $values['textNotSent'] ?? null;
        $this->violations = $values['violations'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
