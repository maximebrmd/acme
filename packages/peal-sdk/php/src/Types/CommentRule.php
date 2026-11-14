<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class CommentRule extends JsonSerializableType
{
    /**
     * @var ?string $channelId
     */
    #[JsonProperty('channelId')]
    public ?string $channelId;

    /**
     * @var array<ChannelCommentRule> $channels
     */
    #[JsonProperty('channels'), ArrayType([ChannelCommentRule::class])]
    public array $channels;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var ?value-of<CommentRuleEndReason> $endedReason
     */
    #[JsonProperty('endedReason')]
    public ?string $endedReason;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var array<string> $keywords
     */
    #[JsonProperty('keywords'), ArrayType(['string'])]
    public array $keywords;

    /**
     * @var array<CommentRuleMatch> $matches
     */
    #[JsonProperty('matches'), ArrayType([CommentRuleMatch::class])]
    public array $matches;

    /**
     * @var ?string $postId
     */
    #[JsonProperty('postId')]
    public ?string $postId;

    /**
     * @var string $reply
     */
    #[JsonProperty('reply')]
    public string $reply;

    /**
     * @var ?string $startedBy
     */
    #[JsonProperty('startedBy')]
    public ?string $startedBy;

    /**
     * @var value-of<CommentRuleStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @param array{
     *   channels: array<ChannelCommentRule>,
     *   createdAt: string,
     *   id: string,
     *   keywords: array<string>,
     *   matches: array<CommentRuleMatch>,
     *   reply: string,
     *   status: value-of<CommentRuleStatus>,
     *   channelId?: ?string,
     *   endedReason?: ?value-of<CommentRuleEndReason>,
     *   postId?: ?string,
     *   startedBy?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'] ?? null;
        $this->channels = $values['channels'];
        $this->createdAt = $values['createdAt'];
        $this->endedReason = $values['endedReason'] ?? null;
        $this->id = $values['id'];
        $this->keywords = $values['keywords'];
        $this->matches = $values['matches'];
        $this->postId = $values['postId'] ?? null;
        $this->reply = $values['reply'];
        $this->startedBy = $values['startedBy'] ?? null;
        $this->status = $values['status'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
