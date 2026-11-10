<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventCommentsReceived extends JsonSerializableType
{
    /**
     * @var int $count
     */
    #[JsonProperty('count')]
    public int $count;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var string $threadId
     */
    #[JsonProperty('threadId')]
    public string $threadId;

    /**
     * @param array{
     *   count: int,
     *   postId: string,
     *   threadId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->count = $values['count'];
        $this->postId = $values['postId'];
        $this->threadId = $values['threadId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
