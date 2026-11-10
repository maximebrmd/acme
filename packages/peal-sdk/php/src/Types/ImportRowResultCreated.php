<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ImportRowResultCreated extends JsonSerializableType
{
    /**
     * @var Post $post
     */
    #[JsonProperty('post')]
    public Post $post;

    /**
     * @var bool $replayed
     */
    #[JsonProperty('replayed')]
    public bool $replayed;

    /**
     * @var int $row
     */
    #[JsonProperty('row')]
    public int $row;

    /**
     * @param array{
     *   post: Post,
     *   replayed: bool,
     *   row: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->post = $values['post'];
        $this->replayed = $values['replayed'];
        $this->row = $values['row'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
