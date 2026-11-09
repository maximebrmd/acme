<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventChannelReconnectRequired extends JsonSerializableType
{
    /**
     * @var NoticeChannel $channel
     */
    #[JsonProperty('channel')]
    public NoticeChannel $channel;

    /**
     * @param array{
     *   channel: NoticeChannel,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channel = $values['channel'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
