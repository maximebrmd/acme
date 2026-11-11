<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

/**
 * How a post goes out on a Bluesky account. Scheduling needs none of them; `replies` limited needs one of `replyFollowers`, `replyFollowing` and `replyMentioned`, and the two gates (`replies`, `disableQuotes`) a channel connected since Peal asks for their scopes.
 */
class BlueskyOptions extends JsonSerializableType
{
    /**
     * @var ?value-of<BlueskyContentLabel> $contentLabel
     */
    #[JsonProperty('contentLabel')]
    public ?string $contentLabel;

    /**
     * @var ?bool $disableQuotes
     */
    #[JsonProperty('disableQuotes')]
    public ?bool $disableQuotes;

    /**
     * @var ?array<string> $languages
     */
    #[JsonProperty('languages'), ArrayType(['string'])]
    public ?array $languages;

    /**
     * @var ?value-of<BlueskyReplies> $replies
     */
    #[JsonProperty('replies')]
    public ?string $replies;

    /**
     * @var ?bool $replyFollowers
     */
    #[JsonProperty('replyFollowers')]
    public ?bool $replyFollowers;

    /**
     * @var ?bool $replyFollowing
     */
    #[JsonProperty('replyFollowing')]
    public ?bool $replyFollowing;

    /**
     * @var ?bool $replyMentioned
     */
    #[JsonProperty('replyMentioned')]
    public ?bool $replyMentioned;

    /**
     * @param array{
     *   contentLabel?: ?value-of<BlueskyContentLabel>,
     *   disableQuotes?: ?bool,
     *   languages?: ?array<string>,
     *   replies?: ?value-of<BlueskyReplies>,
     *   replyFollowers?: ?bool,
     *   replyFollowing?: ?bool,
     *   replyMentioned?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->contentLabel = $values['contentLabel'] ?? null;
        $this->disableQuotes = $values['disableQuotes'] ?? null;
        $this->languages = $values['languages'] ?? null;
        $this->replies = $values['replies'] ?? null;
        $this->replyFollowers = $values['replyFollowers'] ?? null;
        $this->replyFollowing = $values['replyFollowing'] ?? null;
        $this->replyMentioned = $values['replyMentioned'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
