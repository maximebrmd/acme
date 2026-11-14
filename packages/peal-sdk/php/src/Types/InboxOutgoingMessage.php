<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxOutgoingMessage extends JsonSerializableType
{
    /**
     * @var ?string $authorId
     */
    #[JsonProperty('authorId')]
    public ?string $authorId;

    /**
     * @var string $conversationId
     */
    #[JsonProperty('conversationId')]
    public string $conversationId;

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
     * @var ?string $platformMessageId
     */
    #[JsonProperty('platformMessageId')]
    public ?string $platformMessageId;

    /**
     * @var ?value-of<InboxOutgoingMessageReason> $reason
     */
    #[JsonProperty('reason')]
    public ?string $reason;

    /**
     * @var ?string $settledAt
     */
    #[JsonProperty('settledAt')]
    public ?string $settledAt;

    /**
     * @var value-of<InboxOutgoingMessageStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   conversationId: string,
     *   createdAt: string,
     *   id: string,
     *   status: value-of<InboxOutgoingMessageStatus>,
     *   text: string,
     *   authorId?: ?string,
     *   platformMessageId?: ?string,
     *   reason?: ?value-of<InboxOutgoingMessageReason>,
     *   settledAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->authorId = $values['authorId'] ?? null;
        $this->conversationId = $values['conversationId'];
        $this->createdAt = $values['createdAt'];
        $this->id = $values['id'];
        $this->platformMessageId = $values['platformMessageId'] ?? null;
        $this->reason = $values['reason'] ?? null;
        $this->settledAt = $values['settledAt'] ?? null;
        $this->status = $values['status'];
        $this->text = $values['text'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
