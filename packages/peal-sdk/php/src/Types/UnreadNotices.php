<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class UnreadNotices extends JsonSerializableType
{
    /**
     * @var int $unread
     */
    #[JsonProperty('unread')]
    public int $unread;

    /**
     * @param array{
     *   unread: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->unread = $values['unread'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
