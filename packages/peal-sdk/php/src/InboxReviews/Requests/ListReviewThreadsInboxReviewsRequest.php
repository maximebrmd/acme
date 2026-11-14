<?php

namespace Peal\InboxReviews\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\InboxReviews\Types\ListReviewThreadsInboxReviewsRequestUnanswered;

class ListReviewThreadsInboxReviewsRequest extends JsonSerializableType
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
     * @var ?value-of<ListReviewThreadsInboxReviewsRequestUnanswered> $unanswered
     */
    public ?string $unanswered;

    /**
     * @param array{
     *   channelId?: ?string,
     *   cursor?: ?string,
     *   limit?: ?string,
     *   unanswered?: ?value-of<ListReviewThreadsInboxReviewsRequestUnanswered>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->channelId = $values['channelId'] ?? null;
        $this->cursor = $values['cursor'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->unanswered = $values['unanswered'] ?? null;
    }
}
