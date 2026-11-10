<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PostReview extends JsonSerializableType
{
    /**
     * @var array<ApprovalRequest> $approvals
     */
    #[JsonProperty('approvals'), ArrayType([ApprovalRequest::class])]
    public array $approvals;

    /**
     * @var array<ReviewComment> $comments
     */
    #[JsonProperty('comments'), ArrayType([ReviewComment::class])]
    public array $comments;

    /**
     * @param array{
     *   approvals: array<ApprovalRequest>,
     *   comments: array<ReviewComment>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->approvals = $values['approvals'];
        $this->comments = $values['comments'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
