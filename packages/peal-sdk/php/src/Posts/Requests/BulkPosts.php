<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\BulkPost;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class BulkPosts extends JsonSerializableType
{
    /**
     * @var ?string $idempotencyKey
     */
    public ?string $idempotencyKey;

    /**
     * @var array<BulkPost> $posts
     */
    #[JsonProperty('posts'), ArrayType([BulkPost::class])]
    public array $posts;

    /**
     * @param array{
     *   posts: array<BulkPost>,
     *   idempotencyKey?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        $this->posts = $values['posts'];
    }
}
