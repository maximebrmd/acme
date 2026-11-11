<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

/**
 * How a post goes out on a Facebook Page. Scheduling needs none of them; `format` makes it a `story`, sent without the post's text, or a `reel`; `videoTitle` is for a post of a video or a reel.
 */
class FacebookOptions extends JsonSerializableType
{
    /**
     * @var ?value-of<FacebookFormat> $format
     */
    #[JsonProperty('format')]
    public ?string $format;

    /**
     * @var ?string $videoTitle
     */
    #[JsonProperty('videoTitle')]
    public ?string $videoTitle;

    /**
     * @param array{
     *   format?: ?value-of<FacebookFormat>,
     *   videoTitle?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->format = $values['format'] ?? null;
        $this->videoTitle = $values['videoTitle'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
