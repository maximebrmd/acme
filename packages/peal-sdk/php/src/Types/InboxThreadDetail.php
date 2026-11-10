<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class InboxThreadDetail extends JsonSerializableType
{
    /**
     * @var InboxAbilities $abilities
     */
    #[JsonProperty('abilities')]
    public InboxAbilities $abilities;

    /**
     * @var array<InboxComment> $comments
     */
    #[JsonProperty('comments'), ArrayType([InboxComment::class])]
    public array $comments;

    /**
     * @var ?value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public ?string $platform;

    /**
     * @var array<InboxReply> $replies
     */
    #[JsonProperty('replies'), ArrayType([InboxReply::class])]
    public array $replies;

    /**
     * @var InboxThread $thread
     */
    #[JsonProperty('thread')]
    public InboxThread $thread;

    /**
     * @param array{
     *   abilities: InboxAbilities,
     *   comments: array<InboxComment>,
     *   replies: array<InboxReply>,
     *   thread: InboxThread,
     *   platform?: ?value-of<Platform>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->abilities = $values['abilities'];
        $this->comments = $values['comments'];
        $this->platform = $values['platform'] ?? null;
        $this->replies = $values['replies'];
        $this->thread = $values['thread'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
