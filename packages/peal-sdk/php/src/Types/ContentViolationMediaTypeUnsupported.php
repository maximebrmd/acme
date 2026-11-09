<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ContentViolationMediaTypeUnsupported extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public string $platform;

    /**
     * @var string $mediaId
     */
    #[JsonProperty('mediaId')]
    public string $mediaId;

    /**
     * @var value-of<MediaContentType> $contentType
     */
    #[JsonProperty('contentType')]
    public string $contentType;

    /**
     * @param array{
     *   channelId: string,
     *   platform: value-of<Platform>,
     *   mediaId: string,
     *   contentType: value-of<MediaContentType>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->platform = $values['platform'];
        $this->mediaId = $values['mediaId'];
        $this->contentType = $values['contentType'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
