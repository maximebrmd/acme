<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxReviewReply extends JsonSerializableType
{
    /**
     * @var ?string $authorId
     */
    #[JsonProperty('authorId')]
    public ?string $authorId;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?value-of<InboxReviewReplyReason> $reason
     */
    #[JsonProperty('reason')]
    public ?string $reason;

    /**
     * @var string $reviewId
     */
    #[JsonProperty('reviewId')]
    public string $reviewId;

    /**
     * @var ?string $settledAt
     */
    #[JsonProperty('settledAt')]
    public ?string $settledAt;

    /**
     * @var value-of<InboxReplyStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @var string $threadId
     */
    #[JsonProperty('threadId')]
    public string $threadId;

    /**
     * @param array{
     *   createdAt: string,
     *   id: string,
     *   reviewId: string,
     *   status: value-of<InboxReplyStatus>,
     *   text: string,
     *   threadId: string,
     *   authorId?: ?string,
     *   reason?: ?value-of<InboxReviewReplyReason>,
     *   settledAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->authorId = $values['authorId'] ?? null;
        $this->createdAt = $values['createdAt'];
        $this->id = $values['id'];
        $this->reason = $values['reason'] ?? null;
        $this->reviewId = $values['reviewId'];
        $this->settledAt = $values['settledAt'] ?? null;
        $this->status = $values['status'];
        $this->text = $values['text'];
        $this->threadId = $values['threadId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
