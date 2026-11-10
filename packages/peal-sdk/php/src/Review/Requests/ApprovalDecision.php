<?php

namespace Peal\Review\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ApprovalDecision extends JsonSerializableType
{
    /**
     * @var string $approvalId
     */
    #[JsonProperty('approvalId')]
    public string $approvalId;

    /**
     * @var string $subjectHash
     */
    #[JsonProperty('subjectHash')]
    public string $subjectHash;

    /**
     * @param array{
     *   approvalId: string,
     *   subjectHash: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->approvalId = $values['approvalId'];
        $this->subjectHash = $values['subjectHash'];
    }
}
