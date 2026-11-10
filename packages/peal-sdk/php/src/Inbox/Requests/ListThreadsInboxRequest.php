<?php

namespace Peal\Inbox\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Inbox\Types\ListThreadsInboxRequestUnanswered;

class ListThreadsInboxRequest extends JsonSerializableType
{
    /**
     * @var ?string $channelId
     */
    public ?string $channelId;

    /**
     * @var ?string $cursor
     */
    public ?string $cursor;

    /**
     * @var ?string $limit
     */
    public ?string $limit;

    /**
     * @var ?string $postId
     */
    public ?string $postId;

    /**
     * @var ?value-of<ListThreadsInboxRequestUnanswered> $unanswered
     */
    public ?string $unanswered;

    /**
     * @param array{
     *   channelId?: ?string,
     *   cursor?: ?string,
     *   limit?: ?string,
     *   postId?: ?string,
     *   unanswered?: ?value-of<ListThreadsInboxRequestUnanswered>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->channelId = $values['channelId'] ?? null;
        $this->cursor = $values['cursor'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->postId = $values['postId'] ?? null;
        $this->unanswered = $values['unanswered'] ?? null;
    }
}
