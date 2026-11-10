<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventPostApprovalRequested extends JsonSerializableType
{
    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var string $scheduledAt
     */
    #[JsonProperty('scheduledAt')]
    public string $scheduledAt;

    /**
     * @param array{
     *   postId: string,
     *   scheduledAt: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->postId = $values['postId'];
        $this->scheduledAt = $values['scheduledAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
