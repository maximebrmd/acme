<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ApprovalOutcome extends JsonSerializableType
{
    /**
     * @var ApprovalRequest $approval
     */
    #[JsonProperty('approval')]
    public ApprovalRequest $approval;

    /**
     * @var bool $late
     */
    #[JsonProperty('late')]
    public bool $late;

    /**
     * @param array{
     *   approval: ApprovalRequest,
     *   late: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->approval = $values['approval'];
        $this->late = $values['late'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
