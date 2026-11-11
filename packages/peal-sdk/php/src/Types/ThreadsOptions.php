<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

/**
 * How a post goes out on a Threads account. Scheduling needs none of them; `linkAttachment` is for a post without media.
 */
class ThreadsOptions extends JsonSerializableType
{
    /**
     * @var ?string $linkAttachment
     */
    #[JsonProperty('linkAttachment')]
    public ?string $linkAttachment;

    /**
     * @var ?value-of<ThreadsReplyControl> $replyControl
     */
    #[JsonProperty('replyControl')]
    public ?string $replyControl;

    /**
     * @var ?string $topicTag
     */
    #[JsonProperty('topicTag')]
    public ?string $topicTag;

    /**
     * @param array{
     *   linkAttachment?: ?string,
     *   replyControl?: ?value-of<ThreadsReplyControl>,
     *   topicTag?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->linkAttachment = $values['linkAttachment'] ?? null;
        $this->replyControl = $values['replyControl'] ?? null;
        $this->topicTag = $values['topicTag'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
