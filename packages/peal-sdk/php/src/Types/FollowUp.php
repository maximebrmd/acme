<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class FollowUp extends JsonSerializableType
{
    /**
     * @var string $armedAt
     */
    #[JsonProperty('armedAt')]
    public string $armedAt;

    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<FollowUpKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var ?int $likes
     */
    #[JsonProperty('likes')]
    public ?int $likes;

    /**
     * @var ?string $notBefore
     */
    #[JsonProperty('notBefore')]
    public ?string $notBefore;

    /**
     * @var ?string $permalink
     */
    #[JsonProperty('permalink')]
    public ?string $permalink;

    /**
     * @var ?string $platformPostId
     */
    #[JsonProperty('platformPostId')]
    public ?string $platformPostId;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var ?string $reason
     */
    #[JsonProperty('reason')]
    public ?string $reason;

    /**
     * @var ?string $sentAt
     */
    #[JsonProperty('sentAt')]
    public ?string $sentAt;

    /**
     * @var value-of<FollowUpStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var string $targetId
     */
    #[JsonProperty('targetId')]
    public string $targetId;

    /**
     * @var ?string $triggeredAt
     */
    #[JsonProperty('triggeredAt')]
    public ?string $triggeredAt;

    /**
     * @var ?string $until
     */
    #[JsonProperty('until')]
    public ?string $until;

    /**
     * @param array{
     *   armedAt: string,
     *   channelId: string,
     *   id: string,
     *   kind: value-of<FollowUpKind>,
     *   postId: string,
     *   status: value-of<FollowUpStatus>,
     *   targetId: string,
     *   likes?: ?int,
     *   notBefore?: ?string,
     *   permalink?: ?string,
     *   platformPostId?: ?string,
     *   reason?: ?string,
     *   sentAt?: ?string,
     *   triggeredAt?: ?string,
     *   until?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->armedAt = $values['armedAt'];
        $this->channelId = $values['channelId'];
        $this->id = $values['id'];
        $this->kind = $values['kind'];
        $this->likes = $values['likes'] ?? null;
        $this->notBefore = $values['notBefore'] ?? null;
        $this->permalink = $values['permalink'] ?? null;
        $this->platformPostId = $values['platformPostId'] ?? null;
        $this->postId = $values['postId'];
        $this->reason = $values['reason'] ?? null;
        $this->sentAt = $values['sentAt'] ?? null;
        $this->status = $values['status'];
        $this->targetId = $values['targetId'];
        $this->triggeredAt = $values['triggeredAt'] ?? null;
        $this->until = $values['until'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
