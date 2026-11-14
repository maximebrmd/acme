<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxDirectMessage extends JsonSerializableType
{
    /**
     * @var int $attachments
     */
    #[JsonProperty('attachments')]
    public int $attachments;

    /**
     * @var string $conversationId
     */
    #[JsonProperty('conversationId')]
    public string $conversationId;

    /**
     * @var bool $fromAccount
     */
    #[JsonProperty('fromAccount')]
    public bool $fromAccount;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $senderPlatformId
     */
    #[JsonProperty('senderPlatformId')]
    public ?string $senderPlatformId;

    /**
     * @var string $sentAt
     */
    #[JsonProperty('sentAt')]
    public string $sentAt;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   attachments: int,
     *   conversationId: string,
     *   fromAccount: bool,
     *   id: string,
     *   sentAt: string,
     *   text: string,
     *   senderPlatformId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->attachments = $values['attachments'];
        $this->conversationId = $values['conversationId'];
        $this->fromAccount = $values['fromAccount'];
        $this->id = $values['id'];
        $this->senderPlatformId = $values['senderPlatformId'] ?? null;
        $this->sentAt = $values['sentAt'];
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
