<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PostNotReviewableEncoded extends JsonSerializableType
{
    /**
     * @var value-of<PostNotReviewableEncodedStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @param array{
     *   status: value-of<PostNotReviewableEncodedStatus>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->status = $values['status'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
