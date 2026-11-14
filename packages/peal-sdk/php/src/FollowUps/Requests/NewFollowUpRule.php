<?php

namespace Peal\FollowUps\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NewFollowUpRule extends JsonSerializableType
{
    /**
     * @var ?string $channelId
     */
    #[JsonProperty('channelId')]
    public ?string $channelId;

    /**
     * @var ?string $comment
     */
    #[JsonProperty('comment')]
    public ?string $comment;

    /**
     * @var int $likes
     */
    #[JsonProperty('likes')]
    public int $likes;

    /**
     * @var ?string $postId
     */
    #[JsonProperty('postId')]
    public ?string $postId;

    /**
     * @var ?bool $repost
     */
    #[JsonProperty('repost')]
    public ?bool $repost;

    /**
     * @param array{
     *   likes: int,
     *   channelId?: ?string,
     *   comment?: ?string,
     *   postId?: ?string,
     *   repost?: ?bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'] ?? null;
        $this->comment = $values['comment'] ?? null;
        $this->likes = $values['likes'];
        $this->postId = $values['postId'] ?? null;
        $this->repost = $values['repost'] ?? null;
    }
}
