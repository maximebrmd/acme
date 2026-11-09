<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventPostPublished extends JsonSerializableType
{
    /**
     * @var ?NoticeChannel $channel
     */
    #[JsonProperty('channel')]
    public ?NoticeChannel $channel;

    /**
     * @var ?string $permalink
     */
    #[JsonProperty('permalink')]
    public ?string $permalink;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @param array{
     *   postId: string,
     *   channel?: ?NoticeChannel,
     *   permalink?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channel = $values['channel'] ?? null;
        $this->permalink = $values['permalink'] ?? null;
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
