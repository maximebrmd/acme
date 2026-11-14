<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventMessagesReceived extends JsonSerializableType
{
    /**
     * @var NoticeChannel $channel
     */
    #[JsonProperty('channel')]
    public NoticeChannel $channel;

    /**
     * @var string $conversationId
     */
    #[JsonProperty('conversationId')]
    public string $conversationId;

    /**
     * @var int $count
     */
    #[JsonProperty('count')]
    public int $count;

    /**
     * @param array{
     *   channel: NoticeChannel,
     *   conversationId: string,
     *   count: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channel = $values['channel'];
        $this->conversationId = $values['conversationId'];
        $this->count = $values['count'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
