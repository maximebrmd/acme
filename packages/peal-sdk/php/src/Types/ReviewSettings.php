<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ReviewSettings extends JsonSerializableType
{
    /**
     * @var value-of<ApprovalPolicy> $approvalPolicy
     */
    #[JsonProperty('approvalPolicy')]
    public string $approvalPolicy;

    /**
     * @param array{
     *   approvalPolicy: value-of<ApprovalPolicy>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->approvalPolicy = $values['approvalPolicy'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
