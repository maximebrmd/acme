<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class BulkPostResultCreated extends JsonSerializableType
{
    /**
     * @var int $index
     */
    #[JsonProperty('index')]
    public int $index;

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
     * @param array{
     *   index: int,
     *   post: Post,
     *   replayed: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->index = $values['index'];
        $this->post = $values['post'];
        $this->replayed = $values['replayed'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
