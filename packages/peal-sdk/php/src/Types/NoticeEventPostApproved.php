<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventPostApproved extends JsonSerializableType
{
    /**
     * @var value-of<ReviewParty> $by
     */
    #[JsonProperty('by')]
    public string $by;

    /**
     * @var bool $late
     */
    #[JsonProperty('late')]
    public bool $late;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @param array{
     *   by: value-of<ReviewParty>,
     *   late: bool,
     *   postId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->by = $values['by'];
        $this->late = $values['late'];
        $this->postId = $values['postId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
