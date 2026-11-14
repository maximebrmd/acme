<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class InboxConversation extends JsonSerializableType
{
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
     * @var ?string $lastIncomingAt
     */
    #[JsonProperty('lastIncomingAt')]
    public ?string $lastIncomingAt;

    /**
     * @var string $lastMessageAt
     */
    #[JsonProperty('lastMessageAt')]
    public string $lastMessageAt;

    /**
     * @var int $messages
     */
    #[JsonProperty('messages')]
    public int $messages;

    /**
     * @var array<InboxParticipant> $participants
     */
    #[JsonProperty('participants'), ArrayType([InboxParticipant::class])]
    public array $participants;

    /**
     * @var ?string $readAt
     */
    #[JsonProperty('readAt')]
    public ?string $readAt;

    /**
     * @var bool $request
     */
    #[JsonProperty('request')]
    public bool $request;

    /**
     * @var bool $unread
     */
    #[JsonProperty('unread')]
    public bool $unread;

    /**
     * @param array{
     *   channelId: string,
     *   id: string,
     *   lastMessageAt: string,
     *   messages: int,
     *   participants: array<InboxParticipant>,
     *   request: bool,
     *   unread: bool,
     *   lastIncomingAt?: ?string,
     *   readAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->id = $values['id'];
        $this->lastIncomingAt = $values['lastIncomingAt'] ?? null;
        $this->lastMessageAt = $values['lastMessageAt'];
        $this->messages = $values['messages'];
        $this->participants = $values['participants'];
        $this->readAt = $values['readAt'] ?? null;
        $this->request = $values['request'];
        $this->unread = $values['unread'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
