<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class FollowUpRule extends JsonSerializableType
{
    /**
     * @var value-of<FollowUpApprovalState> $approval
     */
    #[JsonProperty('approval')]
    public string $approval;

    /**
     * @var ?string $approvedAt
     */
    #[JsonProperty('approvedAt')]
    public ?string $approvedAt;

    /**
     * @var ?string $approvedBy
     */
    #[JsonProperty('approvedBy')]
    public ?string $approvedBy;

    /**
     * @var array<ChannelFollowUps> $channels
     */
    #[JsonProperty('channels'), ArrayType([ChannelFollowUps::class])]
    public array $channels;

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
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var ?value-of<FollowUpEndReason> $endedReason
     */
    #[JsonProperty('endedReason')]
    public ?string $endedReason;

    /**
     * @var array<FollowUp> $followUps
     */
    #[JsonProperty('followUps'), ArrayType([FollowUp::class])]
    public array $followUps;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

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
     * @var bool $repost
     */
    #[JsonProperty('repost')]
    public bool $repost;

    /**
     * @var ?string $startedBy
     */
    #[JsonProperty('startedBy')]
    public ?string $startedBy;

    /**
     * @var PostOrigin $startedVia
     */
    #[JsonProperty('startedVia')]
    public PostOrigin $startedVia;

    /**
     * @var value-of<FollowUpRuleStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @param array{
     *   approval: value-of<FollowUpApprovalState>,
     *   channels: array<ChannelFollowUps>,
     *   createdAt: string,
     *   followUps: array<FollowUp>,
     *   id: string,
     *   likes: int,
     *   repost: bool,
     *   startedVia: PostOrigin,
     *   status: value-of<FollowUpRuleStatus>,
     *   approvedAt?: ?string,
     *   approvedBy?: ?string,
     *   channelId?: ?string,
     *   comment?: ?string,
     *   endedReason?: ?value-of<FollowUpEndReason>,
     *   postId?: ?string,
     *   startedBy?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->approval = $values['approval'];
        $this->approvedAt = $values['approvedAt'] ?? null;
        $this->approvedBy = $values['approvedBy'] ?? null;
        $this->channels = $values['channels'];
        $this->channelId = $values['channelId'] ?? null;
        $this->comment = $values['comment'] ?? null;
        $this->createdAt = $values['createdAt'];
        $this->endedReason = $values['endedReason'] ?? null;
        $this->followUps = $values['followUps'];
        $this->id = $values['id'];
        $this->likes = $values['likes'];
        $this->postId = $values['postId'] ?? null;
        $this->repost = $values['repost'];
        $this->startedBy = $values['startedBy'] ?? null;
        $this->startedVia = $values['startedVia'];
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
