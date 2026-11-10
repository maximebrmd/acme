<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxReply extends JsonSerializableType
{
    /**
     * @var ?string $authorId
     */
    #[JsonProperty('authorId')]
    public ?string $authorId;

    /**
     * @var string $commentId
     */
    #[JsonProperty('commentId')]
    public string $commentId;

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
     * @var ?string $permalink
     */
    #[JsonProperty('permalink')]
    public ?string $permalink;

    /**
     * @var ?value-of<InboxReplyReason> $reason
     */
    #[JsonProperty('reason')]
    public ?string $reason;

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
     *   commentId: string,
     *   createdAt: string,
     *   id: string,
     *   status: value-of<InboxReplyStatus>,
     *   text: string,
     *   threadId: string,
     *   authorId?: ?string,
     *   permalink?: ?string,
     *   reason?: ?value-of<InboxReplyReason>,
     *   settledAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->authorId = $values['authorId'] ?? null;
        $this->commentId = $values['commentId'];
        $this->createdAt = $values['createdAt'];
        $this->id = $values['id'];
        $this->permalink = $values['permalink'] ?? null;
        $this->reason = $values['reason'] ?? null;
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
