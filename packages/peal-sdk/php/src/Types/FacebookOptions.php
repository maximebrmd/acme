<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

/**
 * How a post goes out on a Facebook Page. Scheduling needs none of them; `videoTitle` is for a post of a video.
 */
class FacebookOptions extends JsonSerializableType
{
    /**
     * @var ?string $videoTitle
     */
    #[JsonProperty('videoTitle')]
    public ?string $videoTitle;

    /**
     * @param array{
     *   videoTitle?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
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
