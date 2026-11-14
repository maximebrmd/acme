<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeChannel extends JsonSerializableType
{
    /**
     * @var string $handle
     */
    #[JsonProperty('handle')]
    public string $handle;

    /**
     * @var value-of<ChannelPlatform> $platform
     */
    #[JsonProperty('platform')]
    public string $platform;

    /**
     * @param array{
     *   handle: string,
     *   platform: value-of<ChannelPlatform>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->handle = $values['handle'];
        $this->platform = $values['platform'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
