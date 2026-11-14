<?php

namespace Peal\FollowUps\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\FollowUpRuleStatus;

class ListFollowUpsRequest extends JsonSerializableType
{
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
     * @var ?value-of<FollowUpRuleStatus> $status
     */
    public ?string $status;

    /**
     * @param array{
     *   cursor?: ?string,
     *   limit?: ?string,
     *   postId?: ?string,
     *   status?: ?value-of<FollowUpRuleStatus>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->cursor = $values['cursor'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->postId = $values['postId'] ?? null;
        $this->status = $values['status'] ?? null;
    }
}
