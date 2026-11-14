<?php

namespace Peal\InboxRules\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\CommentRuleStatus;

class ListCommentRulesInboxRulesRequest extends JsonSerializableType
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
     * @var ?value-of<CommentRuleStatus> $status
     */
    public ?string $status;

    /**
     * @param array{
     *   cursor?: ?string,
     *   limit?: ?string,
     *   status?: ?value-of<CommentRuleStatus>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->cursor = $values['cursor'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->status = $values['status'] ?? null;
    }
}
