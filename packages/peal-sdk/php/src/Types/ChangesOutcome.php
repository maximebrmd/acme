<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ChangesOutcome extends JsonSerializableType
{
    /**
     * @var ApprovalRequest $approval
     */
    #[JsonProperty('approval')]
    public ApprovalRequest $approval;

    /**
     * @var ReviewComment $comment
     */
    #[JsonProperty('comment')]
    public ReviewComment $comment;

    /**
     * @param array{
     *   approval: ApprovalRequest,
     *   comment: ReviewComment,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->approval = $values['approval'];
        $this->comment = $values['comment'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
