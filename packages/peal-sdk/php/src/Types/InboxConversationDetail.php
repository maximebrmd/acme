<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class InboxConversationDetail extends JsonSerializableType
{
    /**
     * @var InboxMessageAbilities $abilities
     */
    #[JsonProperty('abilities')]
    public InboxMessageAbilities $abilities;

    /**
     * @var InboxConversation $conversation
     */
    #[JsonProperty('conversation')]
    public InboxConversation $conversation;

    /**
     * @var array<InboxDirectMessage> $messages
     */
    #[JsonProperty('messages'), ArrayType([InboxDirectMessage::class])]
    public array $messages;

    /**
     * @var ?value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public ?string $platform;

    /**
     * @var array<InboxOutgoingMessage> $sent
     */
    #[JsonProperty('sent'), ArrayType([InboxOutgoingMessage::class])]
    public array $sent;

    /**
     * @var InboxReplyWindow $window
     */
    #[JsonProperty('window')]
    public InboxReplyWindow $window;

    /**
     * @param array{
     *   abilities: InboxMessageAbilities,
     *   conversation: InboxConversation,
     *   messages: array<InboxDirectMessage>,
     *   sent: array<InboxOutgoingMessage>,
     *   window: InboxReplyWindow,
     *   platform?: ?value-of<Platform>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->abilities = $values['abilities'];
        $this->conversation = $values['conversation'];
        $this->messages = $values['messages'];
        $this->platform = $values['platform'] ?? null;
        $this->sent = $values['sent'];
        $this->window = $values['window'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
