<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxThread extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var ?value-of<InboxCollectionEnd> $collectionEnded
     */
    #[JsonProperty('collectionEnded')]
    public ?string $collectionEnded;

    /**
     * @var int $comments
     */
    #[JsonProperty('comments')]
    public int $comments;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $lastCollectedAt
     */
    #[JsonProperty('lastCollectedAt')]
    public ?string $lastCollectedAt;

    /**
     * @var ?string $lastCommentAt
     */
    #[JsonProperty('lastCommentAt')]
    public ?string $lastCommentAt;

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
     * @var string $publishedAt
     */
    #[JsonProperty('publishedAt')]
    public string $publishedAt;

    /**
     * @var string $targetId
     */
    #[JsonProperty('targetId')]
    public string $targetId;

    /**
     * @var int $unanswered
     */
    #[JsonProperty('unanswered')]
    public int $unanswered;

    /**
     * @param array{
     *   channelId: string,
     *   comments: int,
     *   id: string,
     *   postId: string,
     *   publishedAt: string,
     *   targetId: string,
     *   unanswered: int,
     *   collectionEnded?: ?value-of<InboxCollectionEnd>,
     *   lastCollectedAt?: ?string,
     *   lastCommentAt?: ?string,
     *   permalink?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->collectionEnded = $values['collectionEnded'] ?? null;
        $this->comments = $values['comments'];
        $this->id = $values['id'];
        $this->lastCollectedAt = $values['lastCollectedAt'] ?? null;
        $this->lastCommentAt = $values['lastCommentAt'] ?? null;
        $this->permalink = $values['permalink'] ?? null;
        $this->postId = $values['postId'];
        $this->publishedAt = $values['publishedAt'];
        $this->targetId = $values['targetId'];
        $this->unanswered = $values['unanswered'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
