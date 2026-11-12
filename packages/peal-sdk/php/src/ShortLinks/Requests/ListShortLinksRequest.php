<?php

namespace Peal\ShortLinks\Requests;

use Peal\Core\Json\JsonSerializableType;

class ListShortLinksRequest extends JsonSerializableType
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
     * @var ?string $from
     */
    public ?string $from;

    /**
     * @var ?string $limit
     */
    public ?string $limit;

    /**
     * @var ?string $postId
     */
    public ?string $postId;

    /**
     * @var ?string $to
     */
    public ?string $to;

    /**
     * @param array{
     *   channelId?: ?string,
     *   cursor?: ?string,
     *   from?: ?string,
     *   limit?: ?string,
     *   postId?: ?string,
     *   to?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->channelId = $values['channelId'] ?? null;
        $this->cursor = $values['cursor'] ?? null;
        $this->from = $values['from'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->postId = $values['postId'] ?? null;
        $this->to = $values['to'] ?? null;
    }
}
