<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventPostUnconfirmed extends JsonSerializableType
{
    /**
     * @var ?NoticeChannel $channel
     */
    #[JsonProperty('channel')]
    public ?NoticeChannel $channel;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @param array{
     *   postId: string,
     *   channel?: ?NoticeChannel,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channel = $values['channel'] ?? null;
        $this->postId = $values['postId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
