<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventChannelReconnectSoon extends JsonSerializableType
{
    /**
     * @var NoticeChannel $channel
     */
    #[JsonProperty('channel')]
    public NoticeChannel $channel;

    /**
     * @var string $expiresAt
     */
    #[JsonProperty('expiresAt')]
    public string $expiresAt;

    /**
     * @param array{
     *   channel: NoticeChannel,
     *   expiresAt: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channel = $values['channel'];
        $this->expiresAt = $values['expiresAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
