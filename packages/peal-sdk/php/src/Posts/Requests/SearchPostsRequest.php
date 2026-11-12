<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\PostOriginVia;
use Peal\Types\PostOutcome;
use Peal\Types\Platform;
use Peal\Posts\Types\SearchPostsRequestRemoved;
use Peal\Types\PostSort;
use Peal\Types\PostStatus;

class SearchPostsRequest extends JsonSerializableType
{
    /**
     * @var ?string $authorId
     */
    public ?string $authorId;

    /**
     * @var ?string $channelId
     */
    public ?string $channelId;

    /**
     * @var ?value-of<PostOriginVia> $createdVia
     */
    public ?string $createdVia;

    /**
     * @var ?string $cursor
     */
    public ?string $cursor;

    /**
     * @var ?string $from
     */
    public ?string $from;

    /**
     * @var ?string $limit
     */
    public ?string $limit;

    /**
     * @var ?value-of<PostOutcome> $outcome
     */
    public ?string $outcome;

    /**
     * @var ?value-of<Platform> $platform
     */
    public ?string $platform;

    /**
     * @var ?string $queueId
     */
    public ?string $queueId;

    /**
     * @var ?string $recyclingId
     */
    public ?string $recyclingId;

    /**
     * @var ?value-of<SearchPostsRequestRemoved> $removed
     */
    public ?string $removed;

    /**
     * @var ?value-of<PostSort> $sort
     */
    public ?string $sort;

    /**
     * @var ?value-of<PostStatus> $status
     */
    public ?string $status;

    /**
     * @var ?string $tagId
     */
    public ?string $tagId;

    /**
     * @var ?string $to
     */
    public ?string $to;

    /**
     * @param array{
     *   authorId?: ?string,
     *   channelId?: ?string,
     *   createdVia?: ?value-of<PostOriginVia>,
     *   cursor?: ?string,
     *   from?: ?string,
     *   limit?: ?string,
     *   outcome?: ?value-of<PostOutcome>,
     *   platform?: ?value-of<Platform>,
     *   queueId?: ?string,
     *   recyclingId?: ?string,
     *   removed?: ?value-of<SearchPostsRequestRemoved>,
     *   sort?: ?value-of<PostSort>,
     *   status?: ?value-of<PostStatus>,
     *   tagId?: ?string,
     *   to?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->authorId = $values['authorId'] ?? null;
        $this->channelId = $values['channelId'] ?? null;
        $this->createdVia = $values['createdVia'] ?? null;
        $this->cursor = $values['cursor'] ?? null;
        $this->from = $values['from'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->outcome = $values['outcome'] ?? null;
        $this->platform = $values['platform'] ?? null;
        $this->queueId = $values['queueId'] ?? null;
        $this->recyclingId = $values['recyclingId'] ?? null;
        $this->removed = $values['removed'] ?? null;
        $this->sort = $values['sort'] ?? null;
        $this->status = $values['status'] ?? null;
        $this->tagId = $values['tagId'] ?? null;
        $this->to = $values['to'] ?? null;
    }
}
